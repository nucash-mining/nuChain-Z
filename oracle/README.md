# zk-rollup L2 Oracle System

## Overview

This oracle system creates a bridge between Mining Game NFTs on Altcoinchain/Polygon and nuChain L2 zk-Rollup, using Cysic hardware acceleration for zk-proof generation and UTXO sidechain integration.

## Architecture

```
Mining Game NFTs (ALT/POL) → Oracle Contracts → Cross-chain Relayer → nuChain L2
                                                      ↓
Cysic Hardware Mining → zk-Proofs → zChain UTXO → Coordinated Rewards
```

## Components

### 1. Oracle Contracts (`CysicZkOracle.sol`)
- **Altcoinchain**: Monitors Mining Game NFTs (0xf9670e5D46834561813CA79854B3d7147BBbFfb2)
- **Polygon**: Monitors Mining Game NFTs (0x970a8b10147e3459d3cbf56329b76ac18d329728)
- **Functions**: Miner registration, Cysic proof verification, cross-chain relay

### 2. Cross-chain Relayer (`CrossChainRelayer.js`)
- **Purpose**: Relay mining data from ALT/POL to nuChain
- **Method**: LayerZero cross-chain messaging
- **Frequency**: Real-time monitoring with 500ms proof generation

### 3. Cysic Hardware Miner (`cysic-hardware-miner.py`)
- **Hardware**: GPU/FPGA acceleration for zk-proof generation
- **Algorithm**: Cysic-method zk-SNARKs for mining
- **Integration**: Direct connection to nuChain and zChain

### 4. UTXO Sidechain Bridge (`utxo-sidechain-bridge.go`)
- **Purpose**: Coordinate zChain UTXO mining with nuChain L2
- **Features**: Hardware mining rewards, cross-chain synchronization
- **Block Time**: 0.5 seconds (synchronized with nuChain)

## Deployment Instructions

### Prerequisites
```bash
# Install dependencies
npm install
pip3 install asyncio websockets requests
go mod tidy

# Install Ignite CLI
curl https://get.ignite.com/cli@v0.27.1! | bash
```

### 1. Deploy Oracle Contracts

#### Altcoinchain Deployment
```bash
cd contracts
npx hardhat run scripts/deploy-oracle-altcoinchain.js --network altcoinchain
```

#### Polygon Deployment
```bash
npx hardhat run scripts/deploy-oracle-polygon.js --network polygon
```

### 2. Deploy nuChain L2 with Oracle Module
```bash
cd nuchain
ignite chain serve --config config.yml

# Verify oracle module
nuchaind query oracle network-stats
```

### 3. Deploy zChain UTXO Sidechain
```bash
cd z-blockchain
ignite chain serve --config config.yml

# Verify hardware mining
z-blockchaind query utxo mining-stats
```

### 4. Start Cysic Hardware Mining
```bash
cd oracle
./start-cysic-mining.sh

# Monitor mining
curl http://localhost:3002/stats
```

### 5. Start Cross-chain Relayer
```bash
cd oracle
node CrossChainRelayer.js

# Monitor relayer
curl http://localhost:3001/health
```

## Mining Flow

### 1. Miner Registration
```javascript
// Register on Altcoinchain/Polygon
await oracleContract.registerMiner(
  [1, 3, 4], // PC Case, XL1 Processor, TX120 GPU
  "nu1miner000000000000000000000000000000000" // nuChain address
);
```

### 2. Cysic Proof Generation
```python
# Generate hardware-accelerated zk-proof
proof = await cysic_client.generate_mining_proof({
    'rig_ids': [1, 2, 3],
    'hash_power': 2000000,
    'hardware_id': 'nvidia-a100',
    'block_height': current_height
})
```

### 3. Cross-chain Relay
```javascript
// Relay to nuChain
await relayer.relayToNuChain({
  miner: '0x742d35Cc...',
  nuchain_address: 'nu1miner000...',
  hash_power: 2000000,
  cysic_proof: proof_bytes
});
```

### 4. Block Reward Distribution
```go
// nuChain distributes NU tokens
reward := calculateMinerReward(hashPower, totalNetworkHashPower)
distributeNuTokens(nuChainAddress, reward)

// zChain distributes Z tokens + hardware bonus
zReward := baseReward.Add(hardwareBonus)
distributeZTokens(zChainAddress, zReward)
```

## Hardware Requirements

### Supported Hardware
- **NVIDIA RTX 4090**: 2.0 MH/s, +0.005 Z bonus
- **NVIDIA A100**: 2.5 MH/s, +0.005 Z bonus  
- **NVIDIA H100**: 4.0 MH/s, +0.01 Z bonus
- **AMD RX 7900 XTX**: 2.2 MH/s, +0.0055 Z bonus
- **Xilinx FPGA**: 3.0 MH/s, +0.015 Z bonus

### Mining Pool Configuration
```bash
# Pool endpoint
stratum+tcp://pool.nuchain.network:3333

# Worker configuration
worker_name: cysic-miner-1
hardware_id: nvidia-a100
asic_resistant: true
```

## API Endpoints

### Oracle Relayer API
- `GET /health` - Relayer health status
- `GET /stats` - Network mining statistics
- `GET /miners` - Active miner list
- `POST /register` - Register new miner

### Cysic Miner API
- `GET /stats` - Mining performance stats
- `GET /hardware` - Hardware configuration
- `POST /start` - Start mining
- `POST /stop` - Stop mining

### nuChain Oracle Queries
```bash
# Query network stats
nuchaind query oracle network-stats

# Query miner data
nuchaind query oracle miner [address] [source-chain]

# Query block rewards
nuchaind query oracle block-rewards [height]
```

### zChain UTXO Queries
```bash
# Query UTXO set
z-blockchaind query utxo utxo-set

# Query mining stats
z-blockchaind query utxo mining-stats

# Query hardware miners
z-blockchaind query utxo hardware-miners
```

## Monitoring

### Prometheus Metrics
- `nuchain_blocks_total` - nuChain block production
- `zchain_blocks_total` - zChain block production  
- `cysic_proofs_generated_total` - Cysic proof generation rate
- `hardware_miners_active` - Active hardware miners
- `cross_chain_messages_total` - Cross-chain message volume

### Grafana Dashboard
- **Block Production**: Real-time block production rates
- **Mining Performance**: Hash power, WATT consumption, rewards
- **Cross-chain Activity**: Message flow and latency
- **Hardware Stats**: GPU/FPGA utilization and performance

## Security Considerations

### Cysic Proof Verification
- Hardware-specific proof generation prevents spoofing
- ASIC resistance ensures decentralized mining
- zk-SNARK proofs provide computational integrity

### Cross-chain Security
- LayerZero message verification
- Oracle contract access controls
- Multi-signature relayer operations

### UTXO Security
- Script signature verification
- Nullifier tracking for double-spend prevention
- Hardware ID verification for mining rewards

## Troubleshooting

### Common Issues
- **Cysic API Errors**: Check API key and hardware compatibility
- **Cross-chain Delays**: LayerZero messages can take 30-60 seconds
- **Mining Pool Connection**: Verify stratum endpoint and worker credentials
- **Hardware Detection**: Ensure GPU drivers and CUDA are installed

### Debug Commands
```bash
# Check oracle health
curl http://localhost:3001/health

# Check mining stats
curl http://localhost:3002/stats

# Check nuChain status
nuchaind status

# Check zChain status
z-blockchaind status
```

This oracle system enables seamless integration between Mining Game NFTs and the dual blockchain mining system, with hardware-accelerated Cysic proofs providing competitive advantages for GPU/FPGA miners.