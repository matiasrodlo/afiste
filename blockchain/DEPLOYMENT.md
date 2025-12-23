# Smart Contract Deployment Guide

**Date:** 2025-12-21  
**Version:** 1.0

---

##  Overview

This guide covers deploying the Afiste smart contracts to Polygon testnet (Mumbai) and mainnet.

---

##  Prerequisites

1. **Node.js** and **npm** installed
2. **Hardhat** configured
3. **MetaMask** or wallet with:
   - Mumbai testnet MATIC (for testnet)
   - Polygon mainnet MATIC (for mainnet)
4. **Polygonscan API key** (for contract verification)
5. **Environment variables** configured

---

##  Setup

### 1. Install Dependencies

```bash
cd blockchain
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `MUMBAI_PRIVATE_KEY` - Private key for testnet deployment
- `POLYGON_PRIVATE_KEY` - Private key for mainnet deployment
- `POLYGONSCAN_API_KEY` - API key for contract verification
- `MUMBAI_USDT_ADDRESS` - USDT contract on Mumbai
- `POLYGON_USDT_ADDRESS` - USDT contract on Polygon

### 3. Compile Contracts

```bash
npm run compile
```

---

##  Testnet Deployment (Mumbai)

### Step 1: Get Testnet MATIC

1. Visit [Mumbai Faucet](https://faucet.polygon.technology/)
2. Request MATIC to your deployer address

### Step 2: Deploy Contracts

```bash
npm run deploy:mumbai
```

This will:
- Deploy `VCToken` contract
- Deploy `TokenOffering` contract
- Save deployment info to `deployments/mumbai.json`

### Step 3: Verify Contracts

```bash
npm run verify:mumbai
```

This verifies contracts on Polygonscan for transparency.

---

##  Mainnet Deployment (Polygon)

###  WARNING

**Mainnet deployment is IRREVERSIBLE. Ensure:**
1.  All tests pass
2.  Contracts tested on testnet
3.  Security audit completed
4.  Sufficient MATIC for gas
5.  All environment variables correct

### Step 1: Prepare

1. **Fund deployer wallet** with MATIC (recommended: 5+ MATIC)
2. **Verify network** in Hardhat config
3. **Review contracts** one final time

### Step 2: Deploy

```bash
npm run deploy:polygon
```

This will:
- Deploy `VCToken` contract
- Deploy `TokenOffering` contract
- Wait for 5 confirmations
- Save deployment info to `deployments/polygon.json`

### Step 3: Verify Contracts

```bash
npm run verify:polygon
```

### Step 4: Update Backend Configuration

Update `backend/src/config/blockchain.ts` with deployed addresses:

```typescript
export const blockchainConfig = {
  network: 'polygon',
  contracts: {
    vcToken: '0x...', // From deployments/polygon.json
    tokenOffering: '0x...', // From deployments/polygon.json
  },
  // ...
};
```

---

##  Data Migration

After deploying contracts, migrate existing VC fund data:

```bash
npm run migrate:data
```

This script:
- Creates VCToken contracts for existing funds
- Creates on-chain offerings for active token offerings
- Updates database with token addresses

---

##  Verification

### Manual Verification

1. Visit [Polygonscan](https://polygonscan.com/) (mainnet) or [Mumbai Polygonscan](https://mumbai.polygonscan.com/) (testnet)
2. Search for deployed contract addresses
3. Verify contract code is visible
4. Check contract interactions

### Automated Verification

Contracts are automatically verified if:
- `POLYGONSCAN_API_KEY` is set
- Contracts are deployed via Hardhat
- Constructor arguments are correct

---

##  Deployment Files

Deployment information is saved to:
- `deployments/mumbai.json` - Testnet deployments
- `deployments/polygon.json` - Mainnet deployments

Each file contains:
```json
{
  "network": "mumbai",
  "deployer": "0x...",
  "contracts": {
    "VCToken": {
      "address": "0x...",
      "blockNumber": "12345",
      "txHash": "0x..."
    },
    "TokenOffering": {
      "address": "0x...",
      "blockNumber": "12346",
      "txHash": "0x..."
    }
  },
  "stablecoin": "0x...",
  "timestamp": "2025-12-21T..."
}
```

---

##  Security Checklist

Before mainnet deployment:

- [ ] All tests pass
- [ ] Contracts audited
- [ ] Testnet deployment successful
- [ ] Gas estimates reviewed
- [ ] Private keys secure
- [ ] Environment variables correct
- [ ] Backup deployment info
- [ ] Emergency procedures documented
- [ ] Team notified

---

## 🚨 Emergency Procedures

### If Deployment Fails

1. **Check gas price** - May need to increase
2. **Verify balance** - Ensure sufficient MATIC
3. **Check network** - Confirm correct network
4. **Review logs** - Check for specific errors

### If Contract Needs Update

1. **Deploy new version** to testnet
2. **Test thoroughly**
3. **Deploy to mainnet**
4. **Migrate data** if needed
5. **Update backend** configuration

---

##  Post-Deployment

After successful deployment:

1. **Verify contracts** on Polygonscan
2. **Update backend** configuration
3. **Test integration** with backend
4. **Monitor transactions**
5. **Document addresses** for team

---

## 🔗 Useful Links

- [Polygon Documentation](https://docs.polygon.technology/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Polygonscan](https://polygonscan.com/)
- [Mumbai Faucet](https://faucet.polygon.technology/)

---

##  Testing After Deployment

### Testnet Testing

After deploying to testnet, test all functionality:

1. **Token Operations**
   ```bash
   # Mint tokens
   # Transfer tokens
   # Check balances
   ```

2. **Offering Operations**
   ```bash
   # Create offering
   # Purchase tokens
   # Claim tokens
   ```

3. **Integration Testing**
   - Test backend integration
   - Test frontend wallet connection
   - Test complete user flows

### Mainnet Testing

Before going live:
- [ ] Test all contract functions
- [ ] Verify event emissions
- [ ] Test error handling
- [ ] Load testing
- [ ] Security review

---

##  Monitoring

### Contract Monitoring

Monitor deployed contracts for:
- Transaction volume
- Gas usage
- Event emissions
- Error rates

### Tools

- **Polygonscan** - Block explorer and analytics
- **The Graph** - Indexed blockchain data
- **Custom monitoring** - Backend event listeners

---

##  Updates and Maintenance

### Contract Upgrades

If contracts need updates:
1. Deploy new version
2. Migrate data
3. Update backend configuration
4. Notify users

### Emergency Procedures

- **Pause contracts** if critical issue found
- **Migrate to new contracts** if needed
- **Update backend** to use new addresses

---

**Last Updated:** 2025-12-21

