import { run } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Verify contracts on Polygonscan
 */
async function main() {
  const network = process.env.HARDHAT_NETWORK || 'mumbai';
  const deploymentFile = require(`../deployments/${network}.json`);

  console.log(`Verifying contracts on ${network}...`);

  // Verify VCToken
  if (deploymentFile.contracts.VCToken) {
    console.log('\nVerifying VCToken...');
    try {
      await run('verify:verify', {
        address: deploymentFile.contracts.VCToken.address,
        constructorArguments: [
          'VC Fund Token',
          'VCF',
          deploymentFile.deployer,
        ],
      });
      console.log('VCToken verified');
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log('VCToken already verified');
      } else {
        console.error('Error verifying VCToken:', error.message);
      }
    }
  }

  // Verify TokenOffering
  if (deploymentFile.contracts.TokenOffering) {
    console.log('\nVerifying TokenOffering...');
    try {
      await run('verify:verify', {
        address: deploymentFile.contracts.TokenOffering.address,
        constructorArguments: [
          deploymentFile.deployer,
          deploymentFile.stablecoin,
        ],
      });
      console.log('TokenOffering verified');
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log('TokenOffering already verified');
      } else {
        console.error('Error verifying TokenOffering:', error.message);
      }
    }
  }

  console.log('\nVerification complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

