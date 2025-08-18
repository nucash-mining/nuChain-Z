# Oracle Deployment Guide: Mining Game NFT → nuChain L2 Integration

## Overview

This guide covers deploying the complete zk-rollup L2 oracle system that bridges Mining Game NFTs from Altcoinchain/Polygon to nuChain, with Cysic hardware-accelerated mining and UTXO sidechain coordination.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Mining Game NFT │    │   Oracle System  │    │   nuChain L2    │
│ (ALT/POL)       │───▶│   zk-Proofs      │───▶│   Block Rewards │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   zChain UTXO    │
                       │ Hardware Mining  │
                       └──────────────────┘
```

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] **Servers**: 8+ core CPU, 16GB+ RAM, 500GB+ SSD
- [ ] **GPU Hardware**: NVIDIA A100/H100 or AMD RX 7900 XTX
- [ ] **Network**: Stable internet, low latency
- [ ] **Cysic Account**: API access for hardware acceleration

### Software Dependencies
- [ ] **Node.js 18+**: For cross-chain relayer
- [ ] **Python 3.9+**: For Cysic hardware miner
- [ ] **Go 1.21+**: For Cosmos SDK chains
- [ ] **Ignite CLI**: For blockchain deployment
- [ ] **Docker**: For containerized services

### API Keys & Credentials
- [ ] **Cysic API Key**: Hardware acceleration access
- [ ] **Altcoinchain RPC**: L1 settlement layer access
- [ ] **Polygon RPC**: Mining Game NFT access
- [ ] **Private Keys**: For contract deployment and relayer operations

## Step-by-Step Deployment

### Phase 1: Oracle Contract Deployment (Week 1)

#### 1.1 Deploy to Altcoinchain
```bash
cd contracts
npm install

# Configure Altcoinchain network
export ALTCOINCHAIN_RPC="TBD"  # Update with actual RPC
export PRIVATE_KEY="your_private_key_here"

# Deploy oracle contract
npx hardhat run scripts/deploy-oracle-altcoinchain.js --network altcoinchain

# Verify deployment
npx hardhat verify --network altcoinchain [ORACLE_ADDRESS] \
  "0xf9670e5D46834561813CA79854B3d7147BBbFfb2" \
  "0x6645143e49B3a15d8F205658903a55E520444698" \
  "0x0000000000000000000000000000000000000001"
```

#### 1.2 Deploy to Polygon
```bash
# Configure Polygon network
export POLYGON_RPC="https://polygon-rpc.com"

# Deploy oracle contract
npx hardhat run scripts/deploy-oracle-polygon.js --network polygon

# Verify deployment
npx hardhat verify --network polygon [ORACLE_ADDRESS] \
  "0x970a8b10147e3459d3cbf56329b76ac18d329728" \
  "0xE960d5076cd3169C343Ee287A2c3380A222e5839" \
  "0x0000000000000000000000000000000000000002"
```

### Phase 2: nuChain L2 Deployment (Week 2)

#### 2.1 Initialize nuChain with Oracle Module
```bash
cd nuchain

# Initialize chain
nuchaind init nuchain-validator --chain-id nuchain-1

# Add oracle module to genesis
nuchaind add-genesis-account validator 1000000000000000000000nu --keyring-backend test
nuchaind gentx validator 100000000000000000000nu --chain-id nuchain-1 --keyring-backend test
nuchaind collect-gentxs

# Configure oracle parameters
nuchaind genesis add-genesis-oracle-config \
  --min-stake-amount "21000000000000000000" \
  --block-reward "50000000000000000" \
  --supported-chains "altcoinchain-2330,polygon-137"
```

#### 2.2 Start nuChain L2
```bash
# Start nuChain node
nuchaind start \
  --rpc.laddr tcp://0.0.0.0:26657 \
  --api.enable \
  --api.enabled-unsafe-cors

# Verify oracle module
nuchaind query oracle network-stats
```

### Phase 3: zChain UTXO Sidechain (Week 3)

#### 3.1 Initialize zChain with Hardware Mining
```bash
cd z-blockchain

# Initialize UTXO chain
z-blockchaind init zchain-miner --chain-id z-blockchain-1

# Configure hardware mining
z-blockchaind add-genesis-account miner 1000000000000000000000z --keyring-backend test
z-blockchaind gentx miner 100000000000000000000z --chain-id z-blockchain-1 --keyring-backend test
z-blockchaind collect-gentxs

# Enable hardware acceleration
echo "HARDWARE_ACCELERATION=true" >> ~/.z-blockchain/config/hardware.env
echo "ASIC_RESISTANCE=true" >> ~/.z-blockchain/config/hardware.env
```

#### 3.2 Start zChain UTXO Sidechain
```bash
# Start zChain node
z-blockchaind start \
  --rpc.laddr tcp://0.0.0.0:26658 \
  --api.enable \
  --hardware-acceleration

# Verify UTXO module
z-blockchaind query utxo mining-stats
```

### Phase 4: Cysic Hardware Mining (Week 4)

#### 4.1 Setup Cysic Integration
```bash
cd oracle

# Install Python dependencies
pip3 install asyncio websockets requests

# Configure Cysic API
export CYSIC_API_KEY="your_cysic_api_key_here"
export HARDWARE_ID="nvidia-a100"

# Test Cysic connection
python3 -c "
import requests
response = requests.get('https://api.cysic.xyz/v1/health')
print(f'Cysic Status: {response.status_code}')
"
```

#### 4.2 Start Cysic Hardware Mining
```bash
# Start hardware miner
./start-cysic-mining.sh

# Monitor mining performance
curl http://localhost:3002/stats
```

### Phase 5: Cross-chain Relayer (Week 5)

#### 5.1 Configure Cross-chain Relayer
```bash
cd oracle

# Install Node.js dependencies
npm install

# Configure relayer
cp .env.example .env
# Update .env with actual values

# Test connections
node -e "
const relayer = require('./CrossChainRelayer');
relayer.healthCheck().then(console.log);
"
```

#### 5.2 Start Cross-chain Relayer
```bash
# Start relayer service
node CrossChainRelayer.js

# Monitor relayer
curl http://localhost:3001/health
```

## Production Deployment

### Mainnet Configuration

#### nuChain Mainnet with Sonic Labs
```bash
# Contact Sonic Labs for validator setup
# Email: validators@sonic.org
# Provide nuChain specifications:

echo "nuChain L2 zk-Rollup Specifications for Sonic Labs"
echo "=================================================="
echo "Chain ID: nuchain-1"
echo "Block Time: 0.5 seconds"
echo "Consensus: Tendermint BFT"
echo "Staking Token: NU (21 NU minimum)"
echo "Settlement Layer: Altcoinchain (Chain ID 2330)"
echo "Oracle Integration: Mining Game NFT cross-chain"
echo "Hardware Mining: Cysic zk-SNARK acceleration"

# Deploy nuChain mainnet
nuchaind init nuchain-mainnet --chain-id nuchain-1 --home ~/.nuchain-mainnet

# Configure Sonic Labs validators
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

# Start nuChain mainnet
nuchaind start \
  --home ~/.nuchain-mainnet \
  --rpc.laddr tcp://0.0.0.0:26657 \
  --p2p.seeds "sonic-seed-1.sonic.org:26656,sonic-seed-2.sonic.org:26656"
```

#### zChain Mainnet with Hardware Mining
```bash
# Deploy zChain mainnet
z-blockchaind init zchain-mainnet --chain-id z-blockchain-1 --home ~/.z-blockchain-mainnet

# Configure hardware acceleration
cat > ~/.z-blockchain-mainnet/config/hardware.env << EOF
HARDWARE_ACCELERATION_ENABLED=true
ASIC_RESISTANCE_ENABLED=true
MINING_ALGORITHM=equihash_144_5

# Hardware bonuses
NVIDIA_RTX_4090_BONUS=5000000000000000
NVIDIA_A100_BONUS=5000000000000000
NVIDIA_H100_BONUS=10000000000000000
XILINX_FPGA_BONUS=15000000000000000
AMD_RX_7900_XTX_BONUS=5500000000000000

# Mining pool
DEFAULT_POOL=stratum+tcp://pool.z-blockchain.com:3333
EOF

# Start zChain mainnet
z-blockchaind start \
  --home ~/.z-blockchain-mainnet \
  --rpc.laddr tcp://0.0.0.0:26658 \
  --hardware-acceleration \
  --cross-chain-sync
```

### Production Monitoring

#### Prometheus + Grafana Setup
```bash
# Start monitoring stack
docker-compose -f oracle/monitoring/docker-compose.yml up -d

# Access dashboards
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin)"
```

#### Health Monitoring
```bash
# Oracle system health
curl http://localhost:3001/health

# Mining performance
curl http://localhost:3002/stats

# Blockchain status
nuchaind status
z-blockchaind status
```

## Mainnet Deployment Prompts

### nuChain L2 Mainnet Deployment
```bash
echo "🚀 Deploying nuChain L2 zk-Rollup to Mainnet"
echo "============================================="
echo ""
echo "Pre-deployment checklist:"
echo "✅ Sonic Labs validator agreement signed"
echo "✅ Oracle contracts deployed to Altcoinchain & Polygon"
echo "✅ Cysic hardware mining pool configured"
echo "✅ LayerZero endpoints configured"
echo "✅ Mining Game NFT integration tested"
echo ""
read -p "Proceed with nuChain mainnet deployment? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    echo "🎯 Starting nuChain L2 mainnet deployment..."
    # Deployment commands here
else
    echo "❌ Deployment cancelled"
    exit 1
fi
```

### zChain UTXO Mainnet Deployment
```bash
echo "⛏️ Deploying zChain UTXO Sidechain to Mainnet"
echo "=============================================="
echo ""
echo "Hardware requirements verified:"
echo "✅ GPU/FPGA mining hardware available"
echo "✅ Cysic hardware acceleration enabled"
echo "✅ ASIC resistance configured"
echo "✅ Cross-chain sync with nuChain ready"
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

## Support & Troubleshooting

### Common Issues
- **Oracle Contract Errors**: Verify Mining Game NFT contract addresses
- **Cysic API Failures**: Check API key and hardware compatibility
- **Cross-chain Delays**: LayerZero messages can take 30-60 seconds
- **Hardware Detection**: Ensure GPU drivers and CUDA are installed

### Support Channels
- **GitHub Issues**: Technical support and bug reports
- **Discord**: Community discussions and real-time help
- **Email**: oracle-support@z-blockchain.com

### Emergency Procedures
- **Oracle Pause**: Emergency pause oracle contracts if issues detected
- **Mining Pool Failover**: Backup mining pools for continuity
- **Cross-chain Recovery**: Manual message replay if LayerZero fails

---

**Ready for mainnet deployment with Sonic Labs validation! 🚀⛏️**