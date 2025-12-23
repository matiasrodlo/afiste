import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

/**
 * Migrate VC Fund data to blockchain
 * This script creates VCToken contracts for existing VC funds
 */
async function main() {
  const network = process.env.HARDHAT_NETWORK || 'mumbai';
  const deploymentFile = require(`../deployments/${network}.json`);

  console.log(`Migrating VC Fund data to ${network}...`);

  // Connect to database
  const prisma = new PrismaClient();

  try {
    // Get all active VC funds
    const funds = await prisma.vCFund.findMany({
      where: { status: 'active' },
      include: { currency: true },
    });

    console.log(`Found ${funds.length} active VC funds`);

    const [deployer] = await ethers.getSigners();
    const tokenOfferingAddress = deploymentFile.contracts.TokenOffering.address;
    const TokenOfferingFactory = await ethers.getContractFactory('TokenOffering');
    const tokenOffering = TokenOfferingFactory.attach(tokenOfferingAddress);

    for (const fund of funds) {
      console.log(`\nProcessing fund: ${fund.name} (ID: ${fund.id})`);

      // Deploy VCToken for this fund
      const VCTokenFactory = await ethers.getContractFactory('VCToken');
      const tokenName = `${fund.name} Token`;
      const tokenSymbol = fund.currency?.code || 'VCF';

      console.log(`   Deploying VCToken: ${tokenName} (${tokenSymbol})...`);
      const vcToken = await VCTokenFactory.deploy(
        tokenName,
        tokenSymbol,
        deployer.address
      );
      await vcToken.waitForDeployment();
      const tokenAddress = await vcToken.getAddress();
      console.log(`   VCToken deployed: ${tokenAddress}`);

      // Update fund with token address
      await prisma.vCFund.update({
        where: { id: fund.id },
        data: {
          tokenAddress,
          tokenSymbol,
        },
      });

      console.log(`   Fund updated with token address`);

      // If fund has active token offering, create it on-chain
      const offering = await prisma.tokenOffering.findFirst({
        where: {
          vcFundId: fund.id,
          status: 'active',
        },
      });

      if (offering) {
        console.log(`   Creating on-chain offering...`);
        // Convert dates to timestamps
        const startDate = Math.floor(new Date(offering.startDate).getTime() / 1000);
        const endDate = Math.floor(new Date(offering.endDate).getTime() / 1000);

        // Convert prices to wei (assuming 6 decimals for USDT)
        const offeringPrice = ethers.parseUnits(offering.offeringPrice.toString(), 6);
        const minInvestment = ethers.parseUnits(offering.minInvestment.toString(), 6);
        const maxInvestment = ethers.parseUnits(offering.maxInvestment.toString(), 6);
        const totalTokensOffered = ethers.parseUnits(offering.totalTokensOffered.toString(), 18);

        const tx = await tokenOffering.createOffering(
          tokenAddress,
          totalTokensOffered,
          offeringPrice,
          minInvestment,
          maxInvestment,
          startDate,
          endDate,
          offering.whitelistRequired
        );

        await tx.wait();
        console.log(`   On-chain offering created: ${tx.hash}`);
      }
    }

    console.log('\nMigration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

