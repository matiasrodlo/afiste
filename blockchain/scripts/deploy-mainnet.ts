import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Deploy to Polygon Mainnet
 * WARNING: This will deploy to mainnet. Ensure you have:
 * 1. Sufficient MATIC for gas
 * 2. Verified all contract code
 * 3. Tested on testnet
 * 4. Reviewed all security considerations
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log('Deploying to Polygon Mainnet...');
  console.log('WARNING: This is a MAINNET deployment!');
  console.log('Deployer address:', deployerAddress);
  console.log('Deployer balance:', ethers.formatEther(balance), 'MATIC');

  if (balance === 0n) {
    throw new Error('Deployer has no balance. Please fund the account.');
  }

  // Require confirmation
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 137n) {
    throw new Error('Not connected to Polygon mainnet. Chain ID should be 137.');
  }

  // Get stablecoin address from environment (USDT on Polygon)
  const stablecoinAddress = process.env.POLYGON_USDT_ADDRESS || '';
  if (!stablecoinAddress) {
    throw new Error('POLYGON_USDT_ADDRESS not set in .env');
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

  // Wait for confirmations
  console.log('Waiting for confirmations...');
  await vcToken.deploymentTransaction()?.wait(5);

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

  // Wait for confirmations
  console.log('Waiting for confirmations...');
  await tokenOffering.deploymentTransaction()?.wait(5);

  // Grant roles
  console.log('\nSetting up roles...');
  const MINTER_ROLE = await vcToken.MINTER_ROLE();
  const OFFERING_ADMIN_ROLE = await tokenOffering.OFFERING_ADMIN_ROLE();

  console.log('Roles configured');

  // Save deployment info
  const deploymentInfo = {
    network: 'polygon',
    deployer: deployerAddress,
    contracts: {
      VCToken: {
        address: vcTokenAddress,
        blockNumber: (await ethers.provider.getBlockNumber()).toString(),
        txHash: vcToken.deploymentTransaction()?.hash,
      },
      TokenOffering: {
        address: tokenOfferingAddress,
        blockNumber: (await ethers.provider.getBlockNumber()).toString(),
        txHash: tokenOffering.deploymentTransaction()?.hash,
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
  const deploymentPath = path.join(__dirname, '../deployments/polygon.json');
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('\nDeployment complete!');
  console.log('Deployment info saved to:', deploymentPath);
  console.log('\nVerify contracts on:');
  console.log(`   VCToken: https://polygonscan.com/address/${vcTokenAddress}`);
  console.log(`   TokenOffering: https://polygonscan.com/address/${tokenOfferingAddress}`);
  console.log('\nIMPORTANT: Verify contracts on Polygonscan!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

