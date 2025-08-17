# Cross-chain Architecture: zChain ↔ nuChain Integration

## Overview

The cross-chain integration between zChain and nuChain enables coordinated mining rewards, synchronized block production, and seamless communication between the UTXO sidechain and L2 zk-Rollup. This architecture supports the 0.5-second block time target while maintaining security and decentralization.

## Architecture Components

### 1. LayerZero Integration
- **Cross-chain Messaging**: Secure message passing between zChain and nuChain
- **Token Bridging**: Z ↔ NU token transfers with lock/mint mechanism
- **Mining Coordination**: Real-time mining reward notifications and synchronization

### 2. Message Types

#### zChain → nuChain Messages
- **Mining Reward Notifications**: Hardware mining rewards and bonuses
- **Block Synchronization**: Timing coordination for 0.5s blocks
- **Hardware Performance**: GPU/FPGA mining statistics

#### nuChain → zChain Messages
- **Mining Coordination**: Pool operator instructions and configurations
- **Difficulty Adjustment**: Cross-chain difficulty coordination
- **Reward Distribution**: Additional mining incentives

#### External Chain Messages
- **Mining Rig Updates**: NFT component data from Altcoinchain/Polygon
- **Pool Operator Stakes**: 100,000 WATT stake verification
- **WATT Rewards**: Cross-chain WATT token distribution

### 3. Synchronization Mechanism

#### Block Production Coordination
```
zChain Block (0.5s) ──┐
                      ├── Synchronized Production
nuChain Block (0.5s) ─┘
```

#### Timing Parameters
- **Target Block Time**: 500ms (both chains)
- **Sync Tolerance**: 100ms maximum drift
- **Coordination Window**: 50ms for cross-chain messaging

### 4. Mining Reward Flow

#### Hardware Mining (zChain)
1. Miner solves Cysic zk-SNARK proof with GPU/FPGA
2. zChain validates proof and distributes Z tokens + hardware bonus
3. Cross-chain message sent to nuChain with mining data
4. nuChain records mining activity for coordination

#### Pool Mining (nuChain)
1. Mining Game NFT data received from Altcoinchain/Polygon
2. Hash power calculated from NFT component configuration
3. NU tokens distributed proportionally to hash power
4. WATT rewards sent to staking nodes on external chains

## Implementation Details

### LayerZero Message Structure
```solidity
struct CrossChainMessage {
    uint8 messageType;      // Message type identifier
    address sender;         // Original sender address
    bytes payload;          // Message data
    uint256 timestamp;      // Message timestamp
    uint64 nonce;          // Message nonce
}
```

### Mining Reward Notification
```go
type MiningRewardMessage struct {
    Type        string `json:"type"`
    Miner       string `json:"miner"`
    Reward      string `json:"reward"`
    HardwareId  string `json:"hardware_id"`
    BlockHeight int64  `json:"block_height"`
    Timestamp   int64  `json:"timestamp"`
}
```

### Block Synchronization
```go
type BlockSyncMessage struct {
    Type        string `json:"type"`
    BlockHeight int64  `json:"block_height"`
    BlockTime   int64  `json:"block_time"`
    Difficulty  uint64 `json:"difficulty"`
}
```

## Security Model

### Message Verification
- **LayerZero Security**: Cryptographic proof verification for all messages
- **Replay Protection**: Nonce-based message ordering and deduplication
- **Timeout Handling**: Message expiration to prevent stale data

### Cross-chain Validation
- **Mining Proof Verification**: zk-SNARK proofs validated on both chains
- **Stake Verification**: Pool operator stakes verified on source chains
- **Reward Calculation**: Independent verification of reward distributions

### Synchronization Security
- **Drift Detection**: Automatic detection of block time drift
- **Fallback Mechanisms**: Independent operation if cross-chain fails
- **Consensus Protection**: Cross-chain messages don't affect consensus

## Performance Characteristics

### Message Latency
- **zChain → nuChain**: ~200ms average
- **External Chains**: ~30s average (LayerZero standard)
- **Block Sync**: <100ms for coordination messages

### Throughput
- **Mining Rewards**: 2 messages per second (per block)
- **NFT Updates**: Batch processing every 10 blocks
- **Stake Verification**: On-demand processing

### Resource Usage
- **Bandwidth**: ~1KB per cross-chain message
- **Storage**: Minimal on-chain storage for message hashes
- **Compute**: Lightweight message processing

## Monitoring and Analytics

### Key Metrics
- **Message Success Rate**: >99.9% target
- **Block Sync Drift**: <100ms average
- **Mining Reward Latency**: <500ms target
- **Cross-chain Transaction Volume**: Real-time tracking

### Alerting
- **Block Drift Alert**: >1s synchronization drift
- **Message Failure Alert**: >5 consecutive failures
- **Mining Reward Delay**: >30s processing delay

### Dashboards
- **Real-time Block Synchronization**: Visual block production timing
- **Cross-chain Message Flow**: Message volume and success rates
- **Mining Performance**: Hardware mining statistics and rewards

## Deployment Configuration

### LayerZero Endpoints
- **zChain**: Custom endpoint for UTXO sidechain
- **nuChain**: Custom endpoint for L2 zk-Rollup
- **Altcoinchain**: Chain ID 2330 endpoint
- **Polygon**: Chain ID 137 endpoint

### Message Relay Service
- **High Availability**: Multiple relay nodes for redundancy
- **Load Balancing**: Distribute message processing load
- **Failover**: Automatic failover to backup relayers

### Network Configuration
- **RPC Endpoints**: Dedicated RPC nodes for cross-chain queries
- **WebSocket Connections**: Real-time event streaming
- **API Gateways**: Rate limiting and authentication

This cross-chain architecture enables zChain and nuChain to operate as a coordinated dual-blockchain system, providing hardware mining incentives while maintaining fast block times and secure cross-chain communication.