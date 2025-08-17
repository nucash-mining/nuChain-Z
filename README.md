# Z Blockchain & nuChain Mining System

A comprehensive blockchain mining ecosystem featuring Z Blockchain (UTXO privacy sidechain), nuChain (Cosmos L2 zk-Rollup), and Mining Game NFT integration with cross-chain capabilities.

## 🚀 **Quick Start Guide**

### **Prerequisites**
- Node.js 18+
- Go 1.21+
- Docker
- Git
- Ignite CLI v0.27.1+

### **1. Clone and Setup**
```bash
git clone <repository-url>
cd z-blockchain-project
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### **2. Install Dependencies**
```bash
# Install frontend dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

### **3. Deploy Smart Contracts**

#### **Deploy to Altcoinchain (Chain ID: 2330)**
```bash
cd contracts
npm run deploy:altcoinchain
```

#### **Deploy to Polygon (Chain ID: 137)**
```bash
npm run deploy:polygon
```

#### **Deploy WATT Staking Contracts**
```bash
npm run deploy:watt-stake:altcoinchain
npm run deploy:watt-stake:polygon
```

### **4. Start nuChain L2 zk-Rollup**
```bash
# Initialize and start nuChain
./scripts/setup-nuchain.sh

# Or manually:
cd nuchain
ignite chain serve --config config.yml
```

### **5. Start zChain UTXO Privacy Sidechain**
```bash
# Initialize and start zChain
./scripts/setup-zchain.sh

# Or manually:
cd z-blockchain
ignite chain serve --config config.yml
```

### **6. Setup Cross-chain Integration**
```bash
# Configure LayerZero messaging
./scripts/setup-cross-chain.sh
```

### **7. Start Frontend Application**
```bash
npm run dev
```

### **8. Start Z Core Wallet (Optional)**
```bash
cd z-core-wallet
go run main.go

# In another terminal:
cd z-core-wallet/electron
npm install
npm start
```

## 🏗️ **System Architecture**

### **Z Blockchain (UTXO Privacy Sidechain)**
- **Type**: UTXO blockchain with zk-SNARK mining
- **Algorithm**: Equihash 144_5 (zhash) - ASIC resistant
- **Block Time**: 0.5 seconds
- **Reward**: 0.05 Z per block (halving every 210M blocks)
- **Privacy**: Zcash-style shielded transfers with 512-byte encrypted memos
- **Hardware**: GPU/FPGA acceleration support

### **nuChain (Cosmos L2 zk-Rollup)**
- **Type**: Cosmos SDK L2 with zk-Rollup settlement
- **Settlement**: Altcoinchain (L1)
- **Validators**: Sonic Labs network
- **Block Time**: 0.5 seconds (synchronized with zChain)
- **Reward**: 0.05 NU per block (halving every 210M blocks)
- **Staking**: 21 NU minimum for validator nodes

### **Cross-chain Integration**
- **LayerZero**: Secure messaging between all chains
- **Mining Coordination**: Real-time hash rate and reward distribution
- **Token Bridging**: Z ↔ NU token transfers
- **Settlement**: zk-Rollup batches to Altcoinchain L1

## ⛏️ **Mining System**

### **Mining Game NFT Integration**
- **Required Components**: PC Case (ID: 1), XL1 Processor (ID: 3)
- **GPU Options**: TX120 GPU (ID: 4) or GP50 GPU (ID: 5)
- **GPU Limits**: Max 1 TX120, Max 2 GP50, Max 2 total GPUs
- **Genesis Badge**: Optional multiplier (110%-200% hash power boost)

### **Mining Rig Configuration**
1. **Select Components**: Choose NFT components from Mining Game
2. **Build Rig**: Deploy NFT Mining Rig contract with configuration
3. **Set Parameters**: Rig name, nuChain payout address, WATT allowance
4. **Stake NFTs**: Lock components in staking contract for mining

### **Mining Pool Operations**
1. **Deploy Pool**: Stake 100,000 WATT tokens to become pool operator
2. **Configure Pool**: Set name, fees (0-10%), payout frequency
3. **Miner Agreements**: Miners join with contract terms and rig selection
4. **Reward Distribution**: Proportional to hash power contribution

### **Hash Power Calculation**
- **XL1 Processor**: 500,000 H/s (125W consumption)
- **TX120 GPU**: 1,500,000 H/s (320W consumption)
- **GP50 GPU**: 2,000,000 H/s (450W consumption)
- **Genesis Badge**: Multiplies total hash power by rarity tier

## 💰 **Tokenomics**

### **Identical Token Economics**
Both Z and NU tokens share the same emission schedule:

| Parameter | Value |
|-----------|-------|
| Initial Block Reward | 0.05 tokens |
| Block Time | 0.5 seconds |
| Halving Interval | 210,000,000 blocks (~3.33 years) |
| Total Supply | 21,000,000 tokens |
| Emission Rate | 60 tokens per 10 minutes |

### **WATT Token Integration**
- **Mining Consumption**: Paid per block based on rig configuration
- **Pool Operator Stake**: 100,000 WATT required for pool deployment
- **Staking Rewards**: Earned by powered-off NFT rigs
- **Cross-chain**: Distributed via LayerZero to Altcoinchain/Polygon

## 🔗 **Contract Addresses**

### **Altcoinchain (Chain ID: 2330)**
```
Mining Game NFTs: 0xf9670e5D46834561813CA79854B3d7147BBbFfb2
WATT Token: 0x6645143e49B3a15d8F205658903a55E520444698
NFT Staking: 0xe463045318393095F11ed39f1a98332aBCc1A7b1
```

### **Polygon (Chain ID: 137)**
```
Mining Game NFTs: 0x970a8b10147e3459d3cbf56329b76ac18d329728
WATT Token: 0xE960d5076cd3169C343Ee287A2c3380A222e5839
```

## 🎮 **Using the Mining System**

### **Step 1: Build Mining Rig**
1. Open the frontend application
2. Select "Build Mining Rig" tab
3. Choose network (Altcoinchain or Polygon)
4. Add required components:
   - 1x PC Case (Free Mint)
   - 1x XL1 Processor
   - 1-2x Graphics Cards (TX120 or GP50)
   - Optional: Genesis Badge for multiplier
5. Click "Build Mining Rig" to open contract modal
6. Enter rig name, nuChain payout address, WATT allowance
7. Confirm contract deployment

### **Step 2: Deploy Mining Pool (Pool Operators)**
1. Select "Deploy Mining Pool" tab
2. Ensure 100,000 WATT token balance
3. Enter pool configuration:
   - Pool name
   - Fee percentage (0-10%)
   - Payout address
   - Logo URL (optional)
   - Developer donation (optional)
4. Deploy pool contract
5. Pool appears in "Mining Pools" section

### **Step 3: Join Mining Pool (Miners)**
1. Navigate to "Mining Pools" section
2. Browse available pools and their terms
3. Click "Join Pool" on desired pool
4. Review contract agreement:
   - Pool fees
   - Reward distribution
   - WATT consumption terms
5. Select mining rigs to join with
6. Accept contract terms and join

### **Step 4: Stake NFTs for Mining**
1. Go to "Stake NFTs" section
2. Select mining rig to stake
3. Choose staking contract (Altcoinchain or Polygon)
4. Confirm staking transaction
5. Rig becomes active for mining

## 🔧 **Development Commands**

### **Build All Components**
```bash
make build
```

### **Start Development Environment**
```bash
# Start all services
make start

# Or individually:
make start-chains    # Start both blockchains
make start-wallet    # Start wallet services
npm run dev         # Start frontend
```

### **Testing**
```bash
make test           # Run all tests
make test-chains    # Test blockchains
make test-contracts # Test smart contracts
```

### **Deployment**
```bash
make deploy-testnet  # Deploy to testnet
make deploy-mainnet  # Deploy to mainnet (with confirmation)
```

## 📊 **Monitoring & Health**

### **System Status**
```bash
make status         # Check all services
make health         # Perform health check
make logs          # View recent logs
```

### **Network Endpoints**
- **Z Blockchain RPC**: `http://localhost:26657`
- **nuChain RPC**: `http://localhost:26658`
- **Z Blockchain API**: `http://localhost:1317`
- **nuChain API**: `http://localhost:1318`
- **Wallet API**: `http://localhost:8080`
- **Frontend**: `http://localhost:5173`

## 🔐 **Security Features**

### **Privacy Protection**
- **Shielded Transfers**: Zcash-style privacy with zk-SNARKs
- **Encrypted Memos**: 512-byte encrypted transaction messages
- **Nullifier Tracking**: Prevents double spending without revealing inputs
- **Hardware Verification**: ASIC resistance with GPU requirements

### **Cross-chain Security**
- **LayerZero Verification**: Cryptographic proof verification
- **Stake Requirements**: 100,000 WATT for pool operators, 21 NU for validators
- **Message Replay Protection**: Nonce-based ordering and deduplication
- **Hardware Authentication**: Device-specific mining bonuses

## 🚀 **Production Deployment**

### **Infrastructure Requirements**
- **CPU**: 8+ cores for validator nodes
- **Memory**: 16GB+ RAM for UTXO set and zk-proof generation
- **Storage**: 500GB+ SSD for blockchain data
- **GPU**: NVIDIA A100/H100 or AMD RX 7900 XTX for competitive mining
- **Network**: Stable internet, low latency to other validators

### **Deployment Steps**
1. **Setup Infrastructure**: Provision servers with required specifications
2. **Deploy Contracts**: Deploy all smart contracts to mainnet
3. **Initialize Chains**: Start nuChain and zChain with production configs
4. **Configure Cross-chain**: Setup LayerZero endpoints and trusted remotes
5. **Start Services**: Launch all services with monitoring
6. **Verify Health**: Confirm all systems operational

### **Monitoring Setup**
```bash
# Start monitoring services
make monitor-start

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000
```

## 🤝 **Integration Partners**

- **[Altcoinchain](https://altcoinchain.network)** - L1 settlement layer
- **[Sonic Labs](https://sonic.org)** - Validator network
- **[LayerZero](https://layerzero.network)** - Cross-chain messaging
- **[Mining Game](https://mining.game)** - NFT component system
- **[Cysic](https://cysic.xyz)** - zk-proof acceleration

## 📚 **Documentation**

- **[Z Blockchain Architecture](docs/zchain-architecture.md)** - UTXO sidechain details
- **[nuChain Architecture](docs/nuchain-architecture.md)** - L2 zk-Rollup specs
- **[Cross-chain Integration](docs/cross-chain-architecture.md)** - LayerZero messaging
- **[Smart Contracts](contracts/)** - Contract documentation and deployment

## 🆘 **Troubleshooting**

### **Common Issues**
- **Blank Screen**: Check browser console for JavaScript errors
- **Contract Errors**: Verify network connection and contract addresses
- **Mining Issues**: Ensure GPU drivers and CUDA toolkit installed
- **Cross-chain Delays**: LayerZero messages can take 30-60 seconds

### **Support Channels**
- **GitHub Issues**: Technical support and bug reports
- **Discord**: Community discussions and real-time help
- **Documentation**: Comprehensive guides and API references

## 📄 **License**

MIT License - See [LICENSE](LICENSE) for details.

---

**Ready to mine with hardware acceleration and cross-chain coordination! ⚡⛏️**