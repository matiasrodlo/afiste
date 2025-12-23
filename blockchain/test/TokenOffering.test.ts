import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VCToken, TokenOffering } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('TokenOffering', function () {
  let vcToken: VCToken;
  let tokenOffering: TokenOffering;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const TOKEN_NAME = 'VC Fund Token';
  const TOKEN_SYMBOL = 'VCF';
  const OFFERING_PRICE = ethers.parseEther('1.0'); // 1 ETH per token
  const MIN_INVESTMENT = ethers.parseEther('100'); // 100 ETH minimum
  const MAX_INVESTMENT = ethers.parseEther('10000'); // 10,000 ETH maximum
  const TOTAL_TOKENS = ethers.parseEther('100000'); // 100,000 tokens

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy VCToken
    const VCTokenFactory = await ethers.getContractFactory('VCToken');
    vcToken = await VCTokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, owner.address);
    await vcToken.waitForDeployment();

    // Grant minter role to TokenOffering contract
    await vcToken.grantRole(await vcToken.MINTER_ROLE(), owner.address);

    // Deploy TokenOffering
    const TokenOfferingFactory = await ethers.getContractFactory('TokenOffering');
    tokenOffering = await TokenOfferingFactory.deploy(owner.address);
    await tokenOffering.waitForDeployment();

    // Grant minter role to TokenOffering
    await vcToken.grantRole(await vcToken.MINTER_ROLE(), await tokenOffering.getAddress());
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await tokenOffering.owner()).to.equal(owner.address);
    });

    it('Should grant OFFERING_ADMIN_ROLE to owner', async function () {
      expect(await tokenOffering.hasRole(await tokenOffering.OFFERING_ADMIN_ROLE(), owner.address)).to.be.true;
    });
  });

  describe('Creating Offerings', function () {
    it('Should create a new offering', async function () {
      const startDate = Math.floor(Date.now() / 1000);
      const endDate = startDate + 86400 * 30; // 30 days

      await expect(
        tokenOffering.createOffering(
          await vcToken.getAddress(),
          OFFERING_PRICE,
          MIN_INVESTMENT,
          MAX_INVESTMENT,
          TOTAL_TOKENS,
          startDate,
          endDate,
          false
        )
      ).to.emit(tokenOffering, 'OfferingCreated');

      const offering = await tokenOffering.getOffering(0);
      expect(offering.vcToken).to.equal(await vcToken.getAddress());
      expect(offering.offeringPrice).to.equal(OFFERING_PRICE);
      expect(offering.totalTokensOffered).to.equal(TOTAL_TOKENS);
    });

    it('Should revert with invalid token address', async function () {
      await expect(
        tokenOffering.createOffering(
          ethers.ZeroAddress,
          OFFERING_PRICE,
          MIN_INVESTMENT,
          MAX_INVESTMENT,
          TOTAL_TOKENS,
          Math.floor(Date.now() / 1000),
          0,
          false
        )
      ).to.be.revertedWith('TokenOffering: invalid token address');
    });

    it('Should revert with zero price', async function () {
      await expect(
        tokenOffering.createOffering(
          await vcToken.getAddress(),
          0,
          MIN_INVESTMENT,
          MAX_INVESTMENT,
          TOTAL_TOKENS,
          Math.floor(Date.now() / 1000),
          0,
          false
        )
      ).to.be.revertedWith('TokenOffering: price must be greater than 0');
    });
  });

  describe('Purchasing Tokens', function () {
    let offeringId: bigint;
    const startDate = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const endDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now

    beforeEach(async function () {
      const tx = await tokenOffering.createOffering(
        await vcToken.getAddress(),
        OFFERING_PRICE,
        MIN_INVESTMENT,
        MAX_INVESTMENT,
        TOTAL_TOKENS,
        startDate,
        endDate,
        false
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'OfferingCreated'
      );
      offeringId = event?.args[0] || 0n;

      // Activate offering
      await tokenOffering.updateOfferingStatus(offeringId, 1); // Active = 1
    });

    it('Should allow purchase when offering is active', async function () {
      const tokenAmount = ethers.parseEther('100');
      const payment = tokenAmount * OFFERING_PRICE;

      await expect(
        tokenOffering.connect(user1).purchaseTokens(offeringId, tokenAmount, { value: payment })
      )
        .to.emit(tokenOffering, 'TokensPurchased')
        .withArgs(offeringId, user1.address, tokenAmount, payment);

      expect(await vcToken.balanceOf(user1.address)).to.equal(tokenAmount);
    });

    it('Should revert if offering has not started', async function () {
      // Create offering with future start date
      const futureStart = Math.floor(Date.now() / 1000) + 86400;
      const tx = await tokenOffering.createOffering(
        await vcToken.getAddress(),
        OFFERING_PRICE,
        MIN_INVESTMENT,
        MAX_INVESTMENT,
        TOTAL_TOKENS,
        futureStart,
        endDate,
        false
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'OfferingCreated'
      );
      const newOfferingId = event?.args[0] || 0n;

      await tokenOffering.updateOfferingStatus(newOfferingId, 1);

      await expect(
        tokenOffering.connect(user1).purchaseTokens(newOfferingId, ethers.parseEther('100'), {
          value: ethers.parseEther('100'),
        })
      ).to.be.revertedWith('TokenOffering: offering has not started');
    });

    it('Should revert if insufficient payment', async function () {
      const tokenAmount = ethers.parseEther('100');
      const insufficientPayment = tokenAmount * OFFERING_PRICE - ethers.parseEther('1');

      await expect(
        tokenOffering.connect(user1).purchaseTokens(offeringId, tokenAmount, {
          value: insufficientPayment,
        })
      ).to.be.revertedWith('TokenOffering: insufficient payment');
    });

    it('Should refund excess payment', async function () {
      const tokenAmount = ethers.parseEther('100');
      const requiredPayment = tokenAmount * OFFERING_PRICE;
      const excessPayment = requiredPayment + ethers.parseEther('10');

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await tokenOffering.connect(user1).purchaseTokens(offeringId, tokenAmount, {
        value: excessPayment,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const finalBalance = await ethers.provider.getBalance(user1.address);

      // User should receive refund minus gas
      expect(finalBalance).to.be.closeTo(
        initialBalance - requiredPayment - gasUsed,
        ethers.parseEther('0.1')
      );
    });

    it('Should enforce minimum investment', async function () {
      const tokenAmount = ethers.parseEther('50'); // Less than minimum
      const payment = tokenAmount * OFFERING_PRICE;

      await expect(
        tokenOffering.connect(user1).purchaseTokens(offeringId, tokenAmount, { value: payment })
      ).to.be.revertedWith('TokenOffering: below minimum investment');
    });

    it('Should enforce maximum investment', async function () {
      const tokenAmount = ethers.parseEther('11000'); // Exceeds maximum
      const payment = tokenAmount * OFFERING_PRICE;

      await expect(
        tokenOffering.connect(user1).purchaseTokens(offeringId, tokenAmount, { value: payment })
      ).to.be.revertedWith('TokenOffering: exceeds maximum investment');
    });

    it('Should require whitelist if enabled', async function () {
      // Create offering with whitelist required
      const tx = await tokenOffering.createOffering(
        await vcToken.getAddress(),
        OFFERING_PRICE,
        MIN_INVESTMENT,
        MAX_INVESTMENT,
        TOTAL_TOKENS,
        startDate,
        endDate,
        true // whitelist required
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'OfferingCreated'
      );
      const whitelistOfferingId = event?.args[0] || 0n;

      await tokenOffering.updateOfferingStatus(whitelistOfferingId, 1);

      await expect(
        tokenOffering.connect(user1).purchaseTokens(whitelistOfferingId, ethers.parseEther('100'), {
          value: ethers.parseEther('100'),
        })
      ).to.be.revertedWith('TokenOffering: not whitelisted');

      // Add to whitelist and try again
      await tokenOffering.addToWhitelist(whitelistOfferingId, user1.address);
      await tokenOffering.connect(user1).purchaseTokens(whitelistOfferingId, ethers.parseEther('100'), {
        value: ethers.parseEther('100'),
      });

      expect(await vcToken.balanceOf(user1.address)).to.equal(ethers.parseEther('100'));
    });
  });

  describe('Offering Management', function () {
    let offeringId: bigint;

    beforeEach(async function () {
      const tx = await tokenOffering.createOffering(
        await vcToken.getAddress(),
        OFFERING_PRICE,
        MIN_INVESTMENT,
        MAX_INVESTMENT,
        TOTAL_TOKENS,
        Math.floor(Date.now() / 1000),
        0,
        false
      );
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'OfferingCreated'
      );
      offeringId = event?.args[0] || 0n;
    });

    it('Should allow owner to update offering status', async function () {
      await expect(tokenOffering.updateOfferingStatus(offeringId, 1)) // Active
        .to.emit(tokenOffering, 'OfferingStatusUpdated')
        .withArgs(offeringId, 1);
    });

    it('Should allow owner to cancel offering', async function () {
      await expect(tokenOffering.cancelOffering(offeringId))
        .to.emit(tokenOffering, 'OfferingCancelled')
        .withArgs(offeringId);
    });

    it('Should allow owner to manage whitelist', async function () {
      await tokenOffering.addToWhitelist(offeringId, user1.address);
      expect(await tokenOffering.isWhitelisted(offeringId, user1.address)).to.be.true;

      await tokenOffering.removeFromWhitelist(offeringId, user1.address);
      expect(await tokenOffering.isWhitelisted(offeringId, user1.address)).to.be.false;
    });

    it('Should allow batch whitelist operations', async function () {
      await tokenOffering.batchAddToWhitelist(offeringId, [user1.address, user2.address, user3.address]);
      expect(await tokenOffering.isWhitelisted(offeringId, user1.address)).to.be.true;
      expect(await tokenOffering.isWhitelisted(offeringId, user2.address)).to.be.true;
      expect(await tokenOffering.isWhitelisted(offeringId, user3.address)).to.be.true;
    });
  });
});

