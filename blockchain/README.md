# Afiste Blockchain Contracts

Smart contracts for the Afiste VC tokenization platform.

##  Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`
2. Add your private key and RPC URLs
3. Get API keys from [Polygonscan](https://polygonscan.com/) for contract verification

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy to Testnet

```bash
# Deploy to Mumbai testnet
npm run deploy:mumbai
```

### Deploy to Mainnet

```bash
# Deploy to Polygon mainnet
npm run deploy:polygon
```

##  Project Structure

```
blockchain/
├── contracts/          # Smart contracts
│   ├── VCToken.sol
│   └── TokenOffering.sol
├── test/              # Test files
├── scripts/           # Deployment scripts
├── deployments/       # Deployment artifacts
└── hardhat.config.ts  # Hardhat configuration
```

##  Available Scripts

- `npm run compile` - Compile contracts
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run deploy:local` - Deploy to local node
- `npm run deploy:mumbai` - Deploy to Mumbai testnet
- `npm run deploy:polygon` - Deploy to Polygon mainnet
- `npm run verify` - Verify contracts on block explorer
- `npm run node` - Start local Hardhat node
- `npm run clean` - Clean artifacts and cache

##  Networks

- **Localhost** - Local development (Hardhat node)
- **Mumbai** - Polygon testnet
- **Polygon** - Polygon mainnet

##  Contract Documentation

See `docs/BLOCKCHAIN_STRATEGY.md` for architecture and strategy details.

##  Security

- All contracts use OpenZeppelin libraries
- Comprehensive test coverage required
- Security audit before mainnet deployment

## 📄 License

MIT

