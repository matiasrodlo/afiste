import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VCToken } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('VCToken', function () {
  let vcToken: VCToken;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const TOKEN_NAME = 'VC Fund Token';
  const TOKEN_SYMBOL = 'VCF';
  const INITIAL_SUPPLY = ethers.parseEther('1000000');

  beforeEach(async function () {
    [owner, minter, user1, user2, user3] = await ethers.getSigners();

    const VCTokenFactory = await ethers.getContractFactory('VCToken');
    vcToken = await VCTokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, owner.address);
    await vcToken.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the right name and symbol', async function () {
      expect(await vcToken.name()).to.equal(TOKEN_NAME);
      expect(await vcToken.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it('Should set the right owner', async function () {
      expect(await vcToken.owner()).to.equal(owner.address);
    });

    it('Should grant all roles to owner', async function () {
      expect(await vcToken.hasRole(await vcToken.MINTER_ROLE(), owner.address)).to.be.true;
      expect(await vcToken.hasRole(await vcToken.PAUSER_ROLE(), owner.address)).to.be.true;
      expect(await vcToken.hasRole(await vcToken.TRANSFER_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it('Should have transfer restrictions enabled by default', async function () {
      expect(await vcToken.transferRestrictionsEnabled()).to.be.true;
    });
  });

  describe('Minting', function () {
    it('Should allow owner to mint tokens', async function () {
      await vcToken.mint(user1.address, INITIAL_SUPPLY);
      expect(await vcToken.balanceOf(user1.address)).to.equal(INITIAL_SUPPLY);
    });

    it('Should not allow non-minter to mint', async function () {
      await expect(
        vcToken.connect(user1).mint(user2.address, INITIAL_SUPPLY)
      ).to.be.revertedWithCustomError(vcToken, 'AccessControlUnauthorizedAccount');
    });

    it('Should emit Transfer event on mint', async function () {
      await expect(vcToken.mint(user1.address, INITIAL_SUPPLY))
        .to.emit(vcToken, 'Transfer')
        .withArgs(ethers.ZeroAddress, user1.address, INITIAL_SUPPLY);
    });
  });

  describe('Burning', function () {
    beforeEach(async function () {
      await vcToken.mint(user1.address, INITIAL_SUPPLY);
    });

    it('Should allow owner to burn tokens', async function () {
      const burnAmount = ethers.parseEther('1000');
      await vcToken.burn(user1.address, burnAmount);
      expect(await vcToken.balanceOf(user1.address)).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it('Should not allow non-minter to burn', async function () {
      await expect(
        vcToken.connect(user1).burn(user1.address, ethers.parseEther('1000'))
      ).to.be.revertedWithCustomError(vcToken, 'AccessControlUnauthorizedAccount');
    });
  });

  describe('Pausing', function () {
    beforeEach(async function () {
      await vcToken.mint(user1.address, INITIAL_SUPPLY);
      await vcToken.addToWhitelist(user1.address);
      await vcToken.addToWhitelist(user2.address);
    });

    it('Should allow owner to pause', async function () {
      await vcToken.pause();
      expect(await vcToken.paused()).to.be.true;
    });

    it('Should prevent transfers when paused', async function () {
      await vcToken.pause();
      await expect(
        vcToken.connect(user1).transfer(user2.address, ethers.parseEther('100'))
      ).to.be.revertedWithCustomError(vcToken, 'EnforcedPause');
    });

    it('Should allow owner to unpause', async function () {
      await vcToken.pause();
      await vcToken.unpause();
      expect(await vcToken.paused()).to.be.false;
    });
  });

  describe('Whitelist', function () {
    it('Should allow owner to add to whitelist', async function () {
      await vcToken.addToWhitelist(user1.address);
      expect(await vcToken.isWhitelisted(user1.address)).to.be.true;
    });

    it('Should emit WhitelistAdded event', async function () {
      await expect(vcToken.addToWhitelist(user1.address))
        .to.emit(vcToken, 'WhitelistAdded')
        .withArgs(user1.address);
    });

    it('Should allow owner to remove from whitelist', async function () {
      await vcToken.addToWhitelist(user1.address);
      await vcToken.removeFromWhitelist(user1.address);
      expect(await vcToken.isWhitelisted(user1.address)).to.be.false;
    });

    it('Should allow batch adding to whitelist', async function () {
      await vcToken.batchAddToWhitelist([user1.address, user2.address, user3.address]);
      expect(await vcToken.isWhitelisted(user1.address)).to.be.true;
      expect(await vcToken.isWhitelisted(user2.address)).to.be.true;
      expect(await vcToken.isWhitelisted(user3.address)).to.be.true;
    });

    it('Should allow batch removing from whitelist', async function () {
      await vcToken.batchAddToWhitelist([user1.address, user2.address]);
      await vcToken.batchRemoveFromWhitelist([user1.address, user2.address]);
      expect(await vcToken.isWhitelisted(user1.address)).to.be.false;
      expect(await vcToken.isWhitelisted(user2.address)).to.be.false;
    });
  });

  describe('Transfer Restrictions', function () {
    beforeEach(async function () {
      await vcToken.mint(user1.address, INITIAL_SUPPLY);
    });

    it('Should prevent transfer when restrictions enabled and sender not whitelisted', async function () {
      await vcToken.addToWhitelist(user2.address);
      await expect(
        vcToken.connect(user1).transfer(user2.address, ethers.parseEther('100'))
      ).to.be.revertedWithCustomError(vcToken, 'SenderNotWhitelisted');
    });

    it('Should prevent transfer when restrictions enabled and recipient not whitelisted', async function () {
      await vcToken.addToWhitelist(user1.address);
      await expect(
        vcToken.connect(user1).transfer(user2.address, ethers.parseEther('100'))
      ).to.be.revertedWithCustomError(vcToken, 'RecipientNotWhitelisted');
    });

    it('Should allow transfer when both parties are whitelisted', async function () {
      await vcToken.addToWhitelist(user1.address);
      await vcToken.addToWhitelist(user2.address);
      await vcToken.connect(user1).transfer(user2.address, ethers.parseEther('100'));
      expect(await vcToken.balanceOf(user2.address)).to.equal(ethers.parseEther('100'));
    });

    it('Should allow transfer when restrictions disabled', async function () {
      await vcToken.setTransferRestrictions(false);
      await vcToken.connect(user1).transfer(user2.address, ethers.parseEther('100'));
      expect(await vcToken.balanceOf(user2.address)).to.equal(ethers.parseEther('100'));
    });

    it('Should emit TransferRestrictionsToggled event', async function () {
      await expect(vcToken.setTransferRestrictions(false))
        .to.emit(vcToken, 'TransferRestrictionsToggled')
        .withArgs(false);
    });
  });
});

