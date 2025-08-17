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
git clone https://github.com/your-username/z-blockchain-nuchain-mining
cd z-blockchain-nuchain-mining
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

### **3. Start Development Environment**
```bash
# Start frontend application
npm run dev

# The application will be available at http://localhost:5173
```

### **4. Deploy Smart Contracts**

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

## 🏗️ **nuChain L2 zk-Rollup Deployment**

### **Development Deployment**
```bash
# 1. Initialize and start nuChain
./scripts/setup-nuchain.sh

# 2. Or manually:
cd nuchain
ignite chain serve --config config.yml

# 3. Verify deployment
curl http://localhost:26658/status
```

### **Testnet Deployment**
```bash
# 1. Build nuChain binary
cd nuchain
ignite chain build --release

# 2. Initialize testnet
nuchaind init nuchain-testnet --chain-id nuchain-testnet-1

# 3. Configure genesis
nuchaind add-genesis-account validator 1000000000000000000000nu --keyring-backend test
nuchaind gentx validator 100000000000000000000nu --chain-id nuchain-testnet-1 --keyring-backend test
nuchaind collect-gentxs

# 4. Start testnet node
nuchaind start --rpc.laddr tcp://0.0.0.0:26657 --api.enable --api.enabled-unsafe-cors
```

### **Mainnet Deployment with Sonic Labs Validation**

#### **Step 1: Prepare Mainnet Configuration**
```bash
# 1. Build production binary
cd nuchain
ignite chain build --release --output ./build

# 2. Create mainnet genesis
nuchaind init nuchain-mainnet --chain-id nuchain-1 --home ~/.nuchain-mainnet

# 3. Configure mainnet parameters
cat > ~/.nuchain-mainnet/config/genesis.json << EOF
{
  "genesis_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "chain_id": "nuchain-1",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "-1",
      "time_iota_ms": "200"
    }
  },
  "app_state": {
    "mining": {
      "params": {
        "min_stake_amount": "21000000000000000000",
        "block_reward": "50000000000000000",
        "halving_interval": 210000000,
        "supported_chains": ["altcoinchain-2330", "polygon-137"]
      }
    }
  }
}
EOF
```

#### **Step 2: Sonic Labs Validator Integration**
```bash
# 1. Contact Sonic Labs for validator onboarding
# Email: validators@sonic.org
# Discord: https://discord.gg/sonic-labs

# 2. Provide network specifications:
# - Chain ID: nuchain-1
# - Block Time: 0.5 seconds
# - Consensus: Tendermint BFT
# - Staking Token: NU (21 NU minimum)
# - Settlement Layer: Altcoinchain (Chain ID 2330)

# 3. Configure Sonic Labs endpoints
cat > ~/.nuchain-mainnet/config/sonic-validators.json << EOF
{
  "sonic_labs_validators": [
    {
      "moniker": "sonic-validator-1",
      "address": "nuvaloper1...",
      "voting_power": 1000000,
      "commission": "0.05"
    }
  ],
  "validator_requirements": {
    "min_stake": "21000000000000000000",
    "max_validators": 100,
    "unbonding_time": "1814400s"
  }
}
EOF
```

#### **Step 3: Deploy to Mainnet**
```bash
# 1. Generate mainnet validator key
nuchaind keys add mainnet-validator --keyring-backend file --home ~/.nuchain-mainnet

# 2. Add genesis account (coordinate with Sonic Labs)
nuchaind add-genesis-account mainnet-validator 1000000000000000000000nu --home ~/.nuchain-mainnet

# 3. Create genesis transaction
nuchaind gentx mainnet-validator 100000000000000000000nu \
  --chain-id nuchain-1 \
  --keyring-backend file \
  --home ~/.nuchain-mainnet

# 4. Collect genesis transactions from all validators
nuchaind collect-gentxs --home ~/.nuchain-mainnet

# 5. Start mainnet node
nuchaind start \
  --home ~/.nuchain-mainnet \
  --rpc.laddr tcp://0.0.0.0:26657 \
  --p2p.seeds "sonic-seed-1.sonic.org:26656,sonic-seed-2.sonic.org:26656" \
  --api.enable \
  --api.enabled-unsafe-cors
```

## 🔗 **zChain UTXO Sidechain Deployment**

### **Development Deployment**
```bash
# 1. Initialize and start zChain
./scripts/setup-zchain.sh

# 2. Or manually:
cd z-blockchain
ignite chain serve --config config.yml

# 3. Verify deployment
curl http://localhost:26657/status
```

### **Mainnet Deployment with Hardware Mining**

#### **Step 1: Prepare zChain Mainnet**
```bash
# 1. Build zChain binary
cd z-blockchain
ignite chain build --release --output ./build

# 2. Initialize mainnet
z-blockchaind init zchain-mainnet --chain-id z-blockchain-1 --home ~/.z-blockchain-mainnet

# 3. Configure hardware acceleration
cat > ~/.z-blockchain-mainnet/config/hardware.env << EOF
# Hardware Acceleration Configuration
HARDWARE_ACCELERATION_ENABLED=true
ASIC_RESISTANCE_ENABLED=true
MINING_ALGORITHM=equihash_144_5

# Supported Hardware (ASIC Resistant)
NVIDIA_RTX_4090_BONUS=5000000000000000    # 0.005 Z bonus
AMD_RX_7900_XTX_BONUS=5500000000000000   # 0.0055 Z bonus
NVIDIA_A100_BONUS=5000000000000000       # 0.005 Z bonus
NVIDIA_H100_BONUS=10000000000000000      # 0.01 Z bonus
XILINX_FPGA_BONUS=15000000000000000      # 0.015 Z bonus

# Mining Pool Configuration
DEFAULT_POOL=stratum+tcp://pool.z-blockchain.com:3333
BACKUP_POOL=stratum+tcp://backup.z-blockchain.com:3333
EOF
```

#### **Step 2: Coordinate with nuChain**
```bash
# 1. Configure cross-chain messaging
cat > ~/.z-blockchain-mainnet/config/cross-chain.json << EOF
{
  "nuchain_endpoint": "https://rpc.nuchain.network",
  "layerzero_endpoint": "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
  "sync_interval": "500ms",
  "message_types": {
    "mining_reward": 1,
    "block_sync": 2,
    "hardware_stats": 3
  }
}
EOF

# 2. Start zChain mainnet
z-blockchaind start \
  --home ~/.z-blockchain-mainnet \
  --rpc.laddr tcp://0.0.0.0:26657 \
  --api.enable \
  --hardware-acceleration \
  --cross-chain-sync
```

## 🎮 **Mining System Usage**

### **Step 1: Build Mining Rig**
1. Open the frontend application at `http://localhost:5173`
2. Select "Build Mining Rig" tab
3. Choose network (Altcoinchain or Polygon)
4. Add required components:
   - **Free Mint PC Case**: Click "Free Mint" (1 per account)
   - **XL1 Processor**: Click "Buy on OpenSea" → Purchase from OpenSea
   - **Graphics Cards**: Choose TX120 GPU or GP50 GPU from OpenSea
   - **Genesis Badge**: Optional multiplier (+50% efficiency, -WATT cost)
5. Configure rig settings:
   - Rig name
   - nuChain payout address
   - WATT allowance for mining
6. Click "Build Mining Rig" to deploy NFT contract

### **Step 2: Deploy Mining Pool**
1. Select "Deploy Mining Pool" tab
2. Ensure 100,000 WATT token balance
3. Configure pool:
   - Pool name and domain
   - Fee percentage (0-10%)
   - Payout address and frequency
   - Logo URL (optional)
   - Developer donation (optional)
4. Deploy pool contract (stakes 100,000 WATT)

### **Step 3: Join Mining Pool**
1. Navigate to "Mining Pools" section
2. Browse available pools
3. Click "Join Pool" on desired pool
4. Review contract agreement
5. Select mining rigs to join with
6. Accept terms and join

### **Step 4: Stake NFTs**
1. Go to "Stake NFTs" section
2. Select mining rig configuration
3. Choose staking contract
4. Confirm staking transaction

## 📊 **Mainnet Deployment Checklist**

### **Pre-Deployment Requirements**

#### **Infrastructure**
- [ ] **Servers**: 8+ core CPU, 16GB+ RAM, 500GB+ SSD
- [ ] **Network**: Stable internet, low latency to validators
- [ ] **Hardware**: NVIDIA A100/H100 or AMD RX 7900 XTX for mining
- [ ] **Monitoring**: Prometheus + Grafana setup

#### **Sonic Labs Coordination**
- [ ] **Contact Sonic Labs**: validators@sonic.org
- [ ] **Validator Agreement**: Sign validator service agreement
- [ ] **Network Specs**: Provide nuChain technical specifications
- [ ] **Genesis Coordination**: Coordinate genesis file with Sonic validators
- [ ] **Staking Setup**: Ensure 21 NU minimum stake per validator

#### **Smart Contract Deployment**
- [ ] **Altcoinchain Contracts**: Deploy all mining contracts to Chain ID 2330
- [ ] **Polygon Contracts**: Deploy Mining Game integration to Chain ID 137
- [ ] **LayerZero Setup**: Configure cross-chain messaging endpoints
- [ ] **WATT Token Verification**: Verify WATT token contracts on both chains

### **Deployment Steps**

#### **Phase 1: Smart Contracts (Week 1)**
```bash
# Deploy to Altcoinchain mainnet
cd contracts
npm run deploy:altcoinchain -- --network mainnet

# Deploy to Polygon mainnet  
npm run deploy:polygon -- --network mainnet

# Verify contracts
npm run verify:altcoinchain
npm run verify:polygon
```

#### **Phase 2: nuChain L2 (Week 2)**
```bash
# 1. Coordinate with Sonic Labs for validator setup
# 2. Generate mainnet genesis with Sonic validators
# 3. Deploy nuChain L2 with Sonic Labs validation
# 4. Configure LayerZero endpoints for cross-chain messaging
# 5. Test cross-chain mining rig synchronization
```

#### **Phase 3: zChain UTXO Sidechain (Week 3)**
```bash
# 1. Deploy zChain with hardware acceleration
# 2. Configure Equihash 144_5 mining algorithm
# 3. Setup mining pools with ASIC resistance
# 4. Enable cross-chain coordination with nuChain
# 5. Launch hardware mining incentives
```

#### **Phase 4: Cross-Chain Integration (Week 4)**
```bash
# 1. Enable LayerZero messaging between all chains
# 2. Test Z ↔ NU token bridging
# 3. Verify mining reward distribution
# 4. Launch WATTxchange for wBTC ↔ wXMR swaps
# 5. Enable full cross-chain mining operations
```

## 🔧 **Production Configuration**

### **nuChain Mainnet Config**
```yaml
# ~/.nuchain-mainnet/config/config.toml
[consensus]
timeout_commit = "200ms"
timeout_propose = "100ms"
create_empty_blocks_interval = "200ms"

[p2p]
seeds = "sonic-seed-1.sonic.org:26656,sonic-seed-2.sonic.org:26656"
persistent_peers = "sonic-validator-1.sonic.org:26656"

[rpc]
laddr = "tcp://0.0.0.0:26657"
cors_allowed_origins = ["*"]

[api]
enable = true
enabled-unsafe-cors = true
```

### **zChain Mainnet Config**
```yaml
# ~/.z-blockchain-mainnet/config/config.toml
[consensus]
timeout_commit = "200ms"
create_empty_blocks_interval = "200ms"

[mempool]
size = 10000
cache_size = 20000
max_txs_bytes = 2147483648

[hardware]
acceleration_enabled = true
asic_resistance = true
supported_devices = ["nvidia-a100", "nvidia-h100", "amd-rx-7900-xtx"]
```

## 🌐 **Sonic Labs Integration**

### **Validator Requirements**
- **Minimum Stake**: 21 NU tokens per validator
- **Hardware**: 8+ core CPU, 16GB+ RAM, 1TB+ SSD
- **Network**: 100+ Mbps, <50ms latency to other validators
- **Uptime**: 99.9% minimum uptime requirement

### **Sonic Labs Contact Information**
- **Email**: validators@sonic.org
- **Discord**: https://discord.gg/sonic-labs
- **Documentation**: https://docs.sonic.org/validators
- **Validator Portal**: https://validators.sonic.org

### **Integration Steps**
1. **Initial Contact**: Email Sonic Labs with network specifications
2. **Technical Review**: Provide nuChain architecture documentation
3. **Validator Agreement**: Sign service level agreement
4. **Genesis Coordination**: Coordinate genesis file creation
5. **Network Launch**: Launch with Sonic Labs validator support

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

### **Build Mining Rig**
1. **Free Mint PC Case**: Click "Free Mint" (1 per account, additional when staked)
2. **Buy Components**: Click "Buy on OpenSea" for XL1 Processor and GPUs
3. **Configure Rig**: Set name, nuChain address, WATT allowance
4. **Deploy NFT**: Creates mining rig configuration NFT with combined stats
5. **View Stats**: Hash power, WATT cost, efficiency, Genesis Badge bonus

### **Deploy Mining Pool**
1. **Stake 100k WATT**: Required for pool operator status
2. **Configure Pool**: Name, domain, fees, payout settings
3. **Deploy Contract**: Creates mining pool with your configuration
4. **Manage Pool**: View miners, hash power, reward distribution

### **Join Mining Pool**
1. **Browse Pools**: View available pools and their terms
2. **Select Rigs**: Choose which mining rig NFTs to join with
3. **Review Agreement**: Pool fees, WATT consumption, payout terms
4. **Join Pool**: Stake NFTs in pool contract for mining

## 📊 **Monitoring & Analytics**

### **Network Endpoints**
- **Z Blockchain RPC**: `http://localhost:26657`
- **nuChain RPC**: `http://localhost:26658`
- **Z Blockchain API**: `http://localhost:1317`
- **nuChain API**: `http://localhost:1318`
- **Frontend**: `http://localhost:5173`

### **Mainnet Endpoints** (After Deployment)
- **nuChain RPC**: `https://rpc.nuchain.network`
- **zChain RPC**: `https://rpc.z-blockchain.com`
- **Mining Pool**: `stratum+tcp://pool.z-blockchain.com:3333`
- **Block Explorer**: `https://explorer.nuchain.network`

## 🚀 **Future Deployment Prompts**

### **When Deploying nuChain Mainnet:**
```bash
# Use these prompts for mainnet deployment:

echo "🚀 Deploying nuChain L2 zk-Rollup to Mainnet"
echo "============================================="
echo ""
echo "Pre-deployment checklist:"
echo "✅ Sonic Labs validator agreement signed"
echo "✅ Genesis file coordinated with all validators"
echo "✅ LayerZero endpoints configured"
echo "✅ Smart contracts deployed to Altcoinchain & Polygon"
echo "✅ Hardware infrastructure provisioned"
echo ""
read -p "Proceed with mainnet deployment? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    echo "🎯 Starting nuChain mainnet deployment..."
    # Deployment commands here
else
    echo "❌ Deployment cancelled"
    exit 1
fi
```

### **When Deploying zChain Mainnet:**
```bash
echo "⛏️ Deploying zChain UTXO Sidechain to Mainnet"
echo "=============================================="
echo ""
echo "Hardware requirements verified:"
echo "✅ GPU/FPGA mining hardware available"
echo "✅ Equihash 144_5 ASIC resistance enabled"
echo "✅ Cross-chain sync with nuChain configured"
echo "✅ Mining pools ready for hardware miners"
echo ""
echo "⚠️  WARNING: This will start mainnet mining with real rewards"
read -p "Confirm zChain mainnet deployment? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    echo "⚡ Starting zChain mainnet with hardware acceleration..."
    # Deployment commands here
else
    echo "❌ Deployment cancelled"
    exit 1
fi
```

## 🔐 **Security Considerations**

### **Mainnet Security**
- **Private Keys**: Store validator keys in hardware security modules
- **Network Security**: Use VPN and firewall protection
- **Backup Strategy**: Regular backups of validator state and keys
- **Monitoring**: 24/7 monitoring with alerting for downtime

### **Smart Contract Security**
- **Audits**: Complete security audits before mainnet
- **Multi-sig**: Use multi-signature wallets for contract ownership
- **Upgrade Path**: Implement proxy contracts for upgradability
- **Emergency Procedures**: Pause mechanisms for critical issues

## 🤝 **Integration Partners**

- **[Sonic Labs](https://sonic.org)** - Validator network for nuChain
- **[Altcoinchain](https://altcoinchain.network)** - L1 settlement layer
- **[LayerZero](https://layerzero.network)** - Cross-chain messaging
- **[Mining Game](https://mining.game)** - NFT component system
- **[Cysic](https://cysic.xyz)** - zk-proof acceleration

## 📚 **Documentation**

- **[nuChain Architecture](docs/nuchain-architecture.md)** - L2 zk-Rollup specifications
- **[zChain Architecture](docs/zchain-architecture.md)** - UTXO sidechain details
- **[Cross-chain Integration](docs/cross-chain-architecture.md)** - LayerZero messaging
- **[Smart Contracts](contracts/)** - Contract documentation

## 🆘 **Support & Troubleshooting**

### **Common Issues**
- **Node Sync Issues**: Check network connectivity and peer connections
- **Mining Problems**: Verify GPU drivers and hardware acceleration
- **Cross-chain Delays**: LayerZero messages can take 30-60 seconds
- **Contract Errors**: Verify network connection and gas settings

### **Support Channels**
- **GitHub Issues**: Technical support and bug reports
- **Discord**: Community discussions and real-time help
- **Email**: support@z-blockchain.com for enterprise support

## 📄 **License**

MIT License - See [LICENSE](LICENSE) for details.

---

**Ready for mainnet deployment with Sonic Labs validation! 🚀⛏️**