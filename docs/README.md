# Z Blockchain & nuChain Documentation

Welcome to the comprehensive documentation for the Z Blockchain and nuChain project. This documentation covers all aspects of the dual blockchain system, from basic concepts to advanced mining operations.

## 📚 Documentation Structure

### Core Components
- **[Z Blockchain Guide](z-blockchain.md)** - Complete guide to Z Blockchain, the UTXO-based privacy-focused chain
- **[nuChain Guide](nuchain.md)** - Complete guide to nuChain, the Cosmos L2 zk-Rollup 
- **[Z Core Wallet](wallet.md)** - User guide for the desktop wallet application
- **[Mining Guide](mining.md)** - Comprehensive mining setup and operations guide

### Technical Specifications
- **[Architecture Overview](architecture.md)** - System architecture and component interactions
- **[Protocol Specifications](protocol.md)** - Detailed protocol definitions and standards
- **[API Reference](api.md)** - Complete API documentation for both chains
- **[Smart Contracts](contracts.md)** - LayerZero and WATTxchange contract documentation

### Development & Operations
- **[Development Guide](development.md)** - Setup and development workflows
- **[Deployment Guide](deployment.md)** - Production deployment instructions
- **[Monitoring Guide](monitoring.md)** - System monitoring and alerting setup
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

## 🚀 Quick Start

1. **Installation**
   ```bash
   git clone <repository>
   cd z-blockchain-project
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Development**
   ```bash
   # Start Z Blockchain
   cd z-blockchain && ignite chain serve
   
   # Start nuChain (new terminal)
   cd nuchain && ignite chain serve
   
   # Start wallet backend
   cd z-core-wallet && go run main.go
   
   # Start wallet GUI
   cd z-core-wallet/electron && npm start
   ```

3. **Production Deployment**
   ```bash
   ./scripts/deploy.sh mainnet
   ```

## 🏗️ System Overview

### Z Blockchain
- **Type**: UTXO blockchain with zk-SNARK mining
- **Consensus**: Proof-of-Work with hardware acceleration
- **Privacy**: Zcash-style shielded transfers
- **Block Time**: 0.5 seconds
- **Reward**: 0.05 Z per block (halving every 210M blocks)

### nuChain
- **Type**: Cosmos L2 zk-Rollup
- **Settlement**: Altcoinchain (L1)
- **Validator**: Sonic Labs network
- **Block Time**: 0.5 seconds  
- **Reward**: 0.05 NU per block (halving every 210M blocks)

### Cross-Chain Features
- **Bridge**: LayerZero-powered Z ↔ NU token bridging
- **Exchange**: WATTxchange wBTC ↔ wXMR atomic swaps
- **Mining Pools**: Shared mining operations across both chains
- **Hardware Acceleration**: GPU/FPGA support for competitive mining

## 💰 Tokenomics

Both chains share identical tokenomics:

| Parameter | Value |
|-----------|-------|
| Initial Block Reward | 0.05 tokens |
| Halving Interval | 210,000,000 blocks |
| Total Supply | 21,000,000 tokens |
| Emission Rate | 60 tokens per 10 minutes |
| Block Time | 0.5 seconds |

## 🔗 Integration Partners

- **[Altcoinchain](https://altcoinchain.network)** - L1 settlement layer
- **[Sonic Labs](https://sonic.org)** - Validator network
- **[LayerZero](https://layerzero.network)** - Cross-chain messaging
- **[WATTxchange](https://wattxchange.com)** - Decentralized exchange
- **[Cysic](https://cysic.xyz)** - zk-proof acceleration

## 📖 Learning Path

### For Users
1. Start with [Z Core Wallet](wallet.md) to understand the user interface
2. Review [Mining Guide](mining.md) for earning tokens
3. Explore cross-chain features in [Architecture Overview](architecture.md)

### For Developers  
1. Begin with [Development Guide](development.md) for environment setup
2. Study [Protocol Specifications](protocol.md) for technical details
3. Review [API Reference](api.md) for integration capabilities
4. Examine [Smart Contracts](contracts.md) for DeFi features

### For Operators
1. Follow [Deployment Guide](deployment.md) for infrastructure setup
2. Implement [Monitoring Guide](monitoring.md) for system health
3. Keep [Troubleshooting](troubleshooting.md) handy for issue resolution

## 🛠️ Tools & Resources

### Development Tools
- **Ignite CLI** - Cosmos SDK chain scaffolding
- **Go 1.21+** - Backend development
- **Node.js 18+** - Frontend and tooling
- **Docker** - Containerization and deployment

### Monitoring & Analytics
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards  
- **Block Explorer** - Chain state inspection
- **Mining Pool Dashboard** - Pool statistics

### Testing Networks
- **Testnet RPC**: `http://localhost:26657` (Z Blockchain)
- **Testnet RPC**: `http://localhost:26658` (nuChain)  
- **Testnet Faucet**: Available in wallet application
- **Test Mining Pool**: `stratum+tcp://pool-testnet.z-blockchain.com:3333`

## 📞 Support & Community

- **GitHub Issues**: Technical support and bug reports
- **Discord**: Community discussions and real-time help
- **Documentation**: This comprehensive guide
- **Email Support**: For enterprise and partnership inquiries

## 📋 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Code Contributions**: Submit pull requests with clear descriptions
2. **Documentation**: Help improve and expand documentation
3. **Testing**: Report bugs and suggest improvements
4. **Translation**: Help translate documentation to other languages

## 📜 License

This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

*Last updated: January 2025 | Version: 1.0.0*