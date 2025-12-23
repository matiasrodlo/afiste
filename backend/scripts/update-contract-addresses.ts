import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Update backend blockchain configuration with deployed contract addresses
 */
async function main() {
  const network = process.argv[2] || 'mumbai';
  const deploymentFile = path.join(
    __dirname,
    '../../blockchain/deployments',
    `${network}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    console.error(`Deployment file not found: ${deploymentFile}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));

  const configFile = path.join(__dirname, '../src/config/blockchain.ts');
  let config = fs.readFileSync(configFile, 'utf-8');

  // Update VCToken address
  config = config.replace(
    /export const VC_TOKEN_ADDRESS = ['"](.*?)['"]/,
    `export const VC_TOKEN_ADDRESS = '${deployment.contracts.VCToken.address}'`
  );

  // Update TokenOffering address
  config = config.replace(
    /export const TOKEN_OFFERING_ADDRESS = ['"](.*?)['"]/,
    `export const TOKEN_OFFERING_ADDRESS = '${deployment.contracts.TokenOffering.address}'`
  );

  // Update network
  config = config.replace(
    /export const NETWORK = ['"](.*?)['"]/,
    `export const NETWORK = '${network === 'mumbai' ? 'mumbai' : 'polygon'}'`
  );

  fs.writeFileSync(configFile, config);

  console.log('Backend configuration updated');
  console.log(`   Network: ${network}`);
  console.log(`   VCToken: ${deployment.contracts.VCToken.address}`);
  console.log(`   TokenOffering: ${deployment.contracts.TokenOffering.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

