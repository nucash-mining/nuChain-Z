# Z Blockchain & nuChain Development Project

A blockchain project featuring Z Blockchain (UTXO) and nuChain (Cosmos L2 zk-Rollup) with cross-chain capabilities, zk-SNARK mining, and WATTxchange integration.

## Project Overview

### Z Blockchain
- **Type**: UTXO blockchain with zk-proof mining
- **Block Time**: 0.5 seconds
- **Reward**: 0.05 Z per block
- **Mining**: zk-SNARK based (Cysic-style)
- **Total Supply**: 21 million Z tokens

### nuChain
- **Type**: Cosmos L2 zk-Rollup
- **Settlement**: Altcoinchain (L1)
- **Validator**: Sonic Labs
- **Block Time**: 0.5 seconds
- **Reward**: 0.05 NU per block
- **Total Supply**: 21 million NU tokens

### Key Features
- **Halving**: Every 210,000,000 blocks (~3.33 years)
- **Emission Rate**: 50 Z/NU per 10 minutes
- **Cross-chain**: LayerZero integration for Z ↔ nuChain bridging
- **Trading**: WATTxchange integration for wBTC-wXMR swaps
- **Privacy**: Zcash-style shielded transfers with 512-byte memos
- **Mining Pool**: Hardware acceleration support

## Project Structure

```
z-blockchain-project/
├── z-blockchain/          # Z Blockchain implementation
├── nuchain/              # nuChain L2 zk-Rollup
├── z-core-wallet/        # Desktop wallet application
├── contracts/            # Smart contracts
├── scripts/              # Setup and deployment scripts
├── docs/                 # Documentation
└── .vscode/              # VSCode configuration
```

## Prerequisites

- Go 1.21+
- Node.js 18+
- Docker
- Ignite CLI v0.27.1+
- Git

## 🚀 Quick Start

1. **Installation**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Deploy Smart Contracts**
   ```bash
   cd contracts
   npm install
   
   # Deploy to Altcoinchain
   npm run deploy:altcoinchain
   
   # Deploy to Polygon
   npm run deploy:polygon
   ```

3. **Start Frontend**
   ```bash
   npm install
   npm run dev
   ```

4. **Initialize Blockchains**
   ```bash
   # Start nuChain L2
   ./scripts/setup-nuchain.sh
   
   # Start zChain UTXO sidechain
   ./scripts/setup-zchain.sh
   ```

## 🎮 **NFT Mining Rig System**

### **Smart Contracts**
- **NFTMiningRig.sol**: Creates mining rig NFTs from Mining Game components
- **MiningPoolOperator.sol**: Manages mining pools with 100,000 WATT stake requirement
- **LayerZero Integration**: Cross-chain messaging for reward distribution

### **Frontend Components**
- **MiningRigBuilder**: Configure mining rigs from NFT components
- **MiningPoolDashboard**: Manage mining pools and view statistics
- **WATT Staking**: Stake powered-off rigs to earn WATT rewards

### **Key Features**
- Mining rig NFTs combine Mining Game component NFTs
- Genesis Badge NFT multipliers (110%-200% hash power boost)
- Pool operators stake 100,000 WATT tokens (no mining fees)
- Miners pay WATT according to their rig's power consumption
- Cross-chain reward distribution via LayerZero

## 🏗️ System Overview

### Z Blockchain
- **UTXO Model**: Bitcoin-style transaction processing
- **zk-SNARK Mining**: Privacy-preserving proof-of-work
- **Fast Blocks**: 0.5-second confirmation times
- **Shielded Transfers**: Optional privacy with encrypted memos

### nuChain L2
- **Cosmos SDK**: Built on proven blockchain framework
- **zk-Rollup**: Scalable Layer 2 with zk-proof batching
- **Altcoinchain Settlement**: Secure L1 finality
- **Sonic Validation**: Professional validator network

### Cross-chain Features
- **LayerZero Bridge**: Seamless Z ↔ NU token transfers
- **Unified Mining**: Mine both chains simultaneously
- **Shared Security**: Cross-chain validation and consensus
- **Exchange**: WATTxchange wBTC ↔ wXMR atomic swaps
- **Mining Pools**: Shared mining operations across both chains
- **Hardware Acceleration**: GPU/FPGA support for competitive mining

### NFT Mining Game Integration
- **Component NFTs**: CPU, GPU, Memory, Storage, etc. from Mining Game
- **Hash Power Calculation**: Based on component specifications
- **WATT Consumption**: Power cost per block for each component
- **Genesis Badge Multipliers**: Rare badges provide hash power bonuses

## Development Guide

### Building from Source
```bash
# Build all components
./scripts/build.sh

# Deploy to testnet
./scripts/deploy.sh testnet

# Deploy to mainnet
./scripts/deploy.sh mainnet
```

### Testing
```bash
# Run all tests
make test

# Test specific chain
make test-z-blockchain
make test-nuchain
```

## Architecture

### Mining Process
1. Miners solve zk-SNARK puzzles using GPU/FPGA acceleration
2. Valid proofs are submitted to mining pools
3. Block rewards distributed: 0.05 Z/NU per 0.5-second block
4. Hardware acceleration provides competitive mining advantage

### Cross-chain Flow
1. Z Blockchain ↔ nuChain via LayerZero messaging
2. nuChain settles on Altcoinchain L1
3. Sonic Labs provides validation services
4. WATTxchange enables wBTC-wXMR atomic swaps

### Security Features
- Row Level Security (RLS) on all database operations
- zk-SNARK proof verification for mining
- Shielded transfers with encrypted memos
- Multi-signature validator consensus

## Integration Partners

- **Altcoinchain**: L1 settlement layer for nuChain
- **Sonic Labs**: Validator network provider
- **LayerZero**: Cross-chain messaging protocol
- **WATTxchange**: Decentralized exchange integration
- **Cysic**: zk-proof acceleration technology

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For technical support and documentation, visit:
- [Z Blockchain Docs](./docs/z-blockchain.md)
- [nuChain Docs](./docs/nuchain.md)
- [Wallet Guide](./docs/wallet.md)
- [Mining Guide](./docs/mining.md)