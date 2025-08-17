# nuChain L2 Architecture

## Overview

nuChain is a Cosmos SDK-based L2 zk-Rollup that serves as a cross-chain relayer for mining rewards distribution. It settles on Altcoinchain (L1) and uses Sonic Labs as validators, while integrating with Mining Game NFTs on both Altcoinchain and Polygon.

## Architecture Components

### 1. Core Blockchain (Cosmos SDK)
- **Chain ID**: `nuchain-1`
- **Block Time**: 0.5 seconds (200ms timeout_commit)
- **Consensus**: Tendermint BFT with custom mining module
- **Token**: NU (native token)
- **Supply**: 21 million NU tokens (halving every 210M blocks)

### 2. Mining Module (`x/mining`)
The custom mining module handles:
- Cross-chain message processing from Altcoinchain/Polygon
- Mining rig NFT data synchronization
- Pool operator stake verification (100,000 WATT requirement)
- Block reward distribution (0.05 NU per block)
- Staking node management (21 NU minimum stake)

### 3. Cross-chain Integration

#### LayerZero Integration
- **Purpose**: Cross-chain messaging between nuChain ↔ Altcoinchain/Polygon
- **Messages**: Mining rig updates, pool operator stakes, reward distributions
- **Endpoints**: Configurable for different chains

#### Supported Chains
- **Altcoinchain**: Chain ID 2330 (L1 settlement layer)
- **Polygon**: Chain ID 137 (Mining Game NFT deployment)

### 4. Staking System

#### Staking Nodes
- **Minimum Stake**: 21 NU tokens
- **Rewards**: WATT tokens distributed to Altcoinchain/Polygon
- **Voting Power**: Based on staked NU amount
- **Online Requirement**: Must sign blocks to earn rewards

#### Pool Operators
- **Stake Requirement**: 100,000 WATT tokens on source chain
- **Benefits**: No WATT fees for mining nuChain
- **Responsibility**: Manage miners in their pool

### 5. Mining Game NFT Integration

#### Mining Rig NFTs
```go
type MiningRigNFT struct {
    TokenId         uint64  // NFT token ID
    Owner           string  // Owner address
    ChainId         string  // Source chain (altcoinchain-2330 or polygon-137)
    ContractAddress string  // NFT contract address
    HashPower       uint64  // Computed hash power from components
    WattConsumption uint64  // WATT tokens required per block
    IsActive        bool    // Whether rig is actively mining
    LastUpdated     int64   // Last update timestamp
}
```

#### Component-based Mining
- Mining rigs are composed of NFT components (CPU, GPU, Memory, etc.)
- Each component contributes to total hash power and WATT consumption
- Hash power determines mining reward share
- WATT consumption determines mining cost (except for pool operators)

### 6. Reward Distribution

#### Mining Rewards (NU Tokens)
- **Base Reward**: 0.05 NU per block
- **Distribution**: Proportional to hash power contribution
- **Halving**: Every 210,000,000 blocks (~3.33 years)
- **Recipients**: Mining rig NFT owners

#### Staking Rewards (WATT Tokens)
- **Base Reward**: 0.001 WATT per block per online staking node
- **Distribution**: Cross-chain to Altcoinchain/Polygon
- **Requirement**: Node must be online and signing blocks
- **Recipients**: Staking node operators

### 7. zChain Integration

nuChain serves as the coordinator for zChain (UTXO sidechain):
- **Purpose**: Hardware-accelerated zk-proof mining
- **Method**: Cysic-style zk-SNARK puzzles
- **Reward**: Additional mining rewards for hardware miners
- **Block Time**: Synchronized 0.5-second blocks with nuChain

## Data Flow

### 1. Mining Rig Registration
```
Mining Game NFT (Altcoinchain/Polygon) 
    → LayerZero Message 
    → nuChain Mining Module 
    → Store Mining Rig Data
```

### 2. Pool Operator Staking
```
WATT Staking Contract (Altcoinchain/Polygon)
    → LayerZero Message
    → nuChain Mining Module
    → Verify 100,000 WATT Stake
    → Register Pool Operator
```

### 3. Block Reward Distribution
```
nuChain Block Production
    → Calculate Total Hash Power
    → Distribute NU Rewards (proportional to hash power)
    → Send WATT Rewards (LayerZero to external chains)
    → Update Staking Node Status
```

### 4. Cross-chain Settlement
```
nuChain L2 State
    → zk-Rollup Batch
    → Altcoinchain L1 Settlement
    → Sonic Labs Validation
```

## Security Model

### 1. Stake-based Security
- Staking nodes must lock 21 NU tokens
- Pool operators must stake 100,000 WATT tokens
- Slashing for malicious behavior

### 2. Cross-chain Verification
- LayerZero message verification
- Mining rig NFT ownership verification
- WATT token stake verification on source chains

### 3. zk-Rollup Security
- State transitions verified via zk-proofs
- Settlement on Altcoinchain L1 for finality
- Sonic Labs validator network for additional security

## Performance Characteristics

### Block Production
- **Target Block Time**: 0.5 seconds
- **Actual Performance**: ~200ms with optimized Tendermint config
- **Throughput**: ~2 blocks per second
- **Finality**: Instant (single block confirmation)

### Cross-chain Latency
- **LayerZero Message**: ~30 seconds average
- **Settlement to L1**: ~5 minutes (depending on Altcoinchain block time)
- **Reward Distribution**: Real-time within nuChain, cross-chain within 1 minute

## Deployment Architecture

### Node Types
1. **Validator Nodes**: Run consensus, sign blocks, earn WATT rewards
2. **Full Nodes**: Sync full blockchain state, serve RPC/API
3. **Light Nodes**: Sync headers only, minimal resource usage

### Infrastructure Requirements
- **CPU**: 4+ cores for validator nodes
- **Memory**: 8GB+ RAM
- **Storage**: 100GB+ SSD
- **Network**: Stable internet connection, low latency to other validators

### Monitoring
- **Metrics**: Prometheus integration for node metrics
- **Logging**: Structured logging for debugging
- **Alerts**: Block production monitoring, cross-chain message tracking

## Integration Points

### External Systems
1. **Mining Game Contracts**: NFT data synchronization
2. **WATT Token Contracts**: Stake verification and reward distribution
3. **LayerZero Network**: Cross-chain message relay
4. **Altcoinchain L1**: Settlement layer for zk-rollup batches
5. **Sonic Labs**: Validator network services

### APIs
- **RPC**: Standard Cosmos SDK RPC for blockchain queries
- **REST**: RESTful API for web applications
- **gRPC**: High-performance API for system integrations
- **WebSocket**: Real-time updates for mining statistics

This architecture enables nuChain to serve as an efficient L2 solution that bridges traditional blockchain mining with modern NFT-based gaming mechanics, while maintaining security through cross-chain verification and zk-rollup settlement.