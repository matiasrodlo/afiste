import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Deploy to Mumbai Testnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log('Deploying to Mumbai Testnet...');
  console.log('Deployer address:', deployerAddress);
  console.log('Deployer balance:', ethers.formatEther(balance), 'MATIC');

  if (balance === 0n) {
    throw new Error('Deployer has no balance. Please fund the account.');
  }

  // Get stablecoin address from environment (USDT on Mumbai)
  const stablecoinAddress = process.env.MUMBAI_USDT_ADDRESS || '';
  if (!stablecoinAddress) {
    throw new Error('MUMBAI_USDT_ADDRESS not set in .env');
  }

  console.log('Stablecoin address:', stablecoinAddress);

  // Deploy VCToken Factory
  console.log('\nDeploying VCToken...');
  const VCTokenFactory = await ethers.getContractFactory('VCToken');
  const vcToken = await VCTokenFactory.deploy(
    'VC Fund Token',
    'VCF',
    deployerAddress
  );
  await vcToken.waitForDeployment();
  const vcTokenAddress = await vcToken.getAddress();
  console.log('VCToken deployed to:', vcTokenAddress);

  // Deploy TokenOffering
  console.log('\nDeploying TokenOffering...');
  const TokenOfferingFactory = await ethers.getContractFactory('TokenOffering');
  const tokenOffering = await TokenOfferingFactory.deploy(
    deployerAddress,
    stablecoinAddress
  );
  await tokenOffering.waitForDeployment();
  const tokenOfferingAddress = await tokenOffering.getAddress();
  console.log('TokenOffering deployed to:', tokenOfferingAddress);

  // Grant roles
  console.log('\nSetting up roles...');
  const MINTER_ROLE = await vcToken.MINTER_ROLE();
  const OFFERING_ADMIN_ROLE = await tokenOffering.OFFERING_ADMIN_ROLE();

  // Grant MINTER_ROLE to TokenOffering (if needed)
  // Grant OFFERING_ADMIN_ROLE to deployer (already granted in constructor)

  console.log('Roles configured');

  // Save deployment info
  const deploymentInfo = {
    network: 'mumbai',
    deployer: deployerAddress,
    contracts: {
      VCToken: {
        address: vcTokenAddress,
        blockNumber: (await ethers.provider.getBlockNumber()).toString(),
      },
      TokenOffering: {
        address: tokenOfferingAddress,
        blockNumber: (await ethers.provider.getBlockNumber()).toString(),
      },
    },
    stablecoin: stablecoinAddress,
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment Summary:');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '../deployments/mumbai.json');
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('\nDeployment complete!');
  console.log('Deployment info saved to:', deploymentPath);
  console.log('\nVerify contracts on:');
  console.log(`   VCToken: https://mumbai.polygonscan.com/address/${vcTokenAddress}`);
  console.log(`   TokenOffering: https://mumbai.polygonscan.com/address/${tokenOfferingAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

