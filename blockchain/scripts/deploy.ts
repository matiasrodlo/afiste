import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy VCToken
  console.log('\nDeploying VCToken...');
  const VCTokenFactory = await ethers.getContractFactory('VCToken');
  const vcToken = await VCTokenFactory.deploy(
    'VC Fund Token',
    'VCF',
    deployer.address
  );
  await vcToken.waitForDeployment();
  const vcTokenAddress = await vcToken.getAddress();
  console.log('VCToken deployed to:', vcTokenAddress);

  // Deploy TokenOffering
  console.log('\nDeploying TokenOffering...');
  const TokenOfferingFactory = await ethers.getContractFactory('TokenOffering');
  const tokenOffering = await TokenOfferingFactory.deploy(deployer.address);
  await tokenOffering.waitForDeployment();
  const tokenOfferingAddress = await tokenOffering.getAddress();
  console.log('TokenOffering deployed to:', tokenOfferingAddress);

  // Grant minter role to TokenOffering
  console.log('\nGranting minter role to TokenOffering...');
  const MINTER_ROLE = await vcToken.MINTER_ROLE();
  const grantTx = await vcToken.grantRole(MINTER_ROLE, tokenOfferingAddress);
  await grantTx.wait();
  console.log('Minter role granted');

  console.log('\nDeployment Summary:');
  console.log('VCToken:', vcTokenAddress);
  console.log('TokenOffering:', tokenOfferingAddress);
  console.log('\nDeployment complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

