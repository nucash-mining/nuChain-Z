# zChain UTXO Sidechain Architecture

## Overview

zChain is a UTXO-based sidechain of nuChain that provides hardware-accelerated zk-proof mining rewards for achieving 0.5-second block times. It implements Zcash-style privacy features with Cysic-method zk-SNARK mining for competitive hardware advantages.

## Architecture Components

### 1. UTXO Model
- **Transaction Structure**: Bitcoin-style inputs and outputs
- **Script System**: Simplified script verification for signatures
- **UTXO Set**: Efficient unspent transaction output tracking
- **Privacy Layer**: Zcash-style shielded transactions with nullifiers and commitments

### 2. Hardware-Accelerated Mining
- **Equihash 144_5 (zhash)**: ASIC-resistant mining algorithm like Zcash
- **Supported Hardware**: Consumer and professional GPUs (NVIDIA RTX, AMD RX series)
- **ASIC Resistance**: 1GB memory requirement prevents ASIC mining
- **Hardware Bonuses**: Additional rewards for acceleration
  - NVIDIA RTX 4090: +0.005 Z bonus per block
  - AMD RX 7900 XTX: +0.0055 Z bonus per block
  - Professional GPUs: Additional bonuses for data centers
- **Mining Pools**: Collaborative mining with shared rewards

### 3. Block Production
- **Target Block Time**: 0.5 seconds (200ms timeout_commit)
- **Difficulty Adjustment**: Every 2016 blocks (Bitcoin-style)
- **Block Rewards**: 0.05 Z tokens per block with halving every 210M blocks
- **Hardware Incentives**: Bonus rewards for GPU/FPGA acceleration

## Core Modules

### UTXO Module (`x/utxo`)

#### Transaction Types
1. **Standard UTXO Transactions**
   - Input validation and UTXO spending
   - Output creation and script verification
   - Fee calculation and validation

2. **Shielded Transactions**
   - zk-SNARK proof verification
   - Nullifier tracking to prevent double spending
   - Commitment tree management for privacy

3. **Mining Proof Transactions**
   - Hardware-accelerated proof submission
   - Difficulty target verification
   - Mining reward distribution

#### Key Features
- **Script Verification**: ECDSA signature validation
- **UTXO Management**: Efficient spent/unspent tracking
- **Privacy Protection**: Encrypted 512-byte memos
- **Hardware Integration**: GPU/FPGA acceleration support

## Mining System

### Hardware Acceleration
```go
type MiningProof struct {
    MinerAddress string  // Miner's address
    ZkProof      []byte  // Cysic-style zk-SNARK proof
    PublicInputs []byte  // Block header, difficulty, etc.
    Nonce        uint64  // Mining nonce
    Difficulty   uint64  // Target difficulty
    HardwareId   string  // GPU/FPGA identifier
}
```

### Supported Hardware
- **NVIDIA A100**: +0.005 Z bonus per block
- **NVIDIA H100**: +0.01 Z bonus per block  
- **Xilinx FPGA**: +0.015 Z bonus per block

### Mining Process
1. Miner generates zk-SNARK proof using hardware acceleration
2. Proof includes block header, difficulty target, and hardware ID
3. Network verifies proof using Cysic verification library
4. Base reward (0.05 Z) + hardware bonus distributed to miner
5. Difficulty adjusts every 2016 blocks to maintain 0.5s target

## Privacy Features

### Shielded Transactions
- **Nullifiers**: Prevent double spending without revealing inputs
- **Commitments**: Hide transaction amounts and recipients
- **Encrypted Memos**: 512-byte encrypted messages
- **zk-SNARK Proofs**: Zero-knowledge transaction validation

### Privacy Model
```go
type ShieldedTransaction struct {
    TxHash        string    // Transaction hash
    Nullifiers    [][]byte  // Input nullifiers
    Commitments   [][]byte  // Output commitments
    ZkProof       []byte    // Privacy proof
    EncryptedMemo []byte    // 512-byte encrypted memo
    Fee           string    // Transaction fee
}
```

## Performance Characteristics

### Block Production
- **Target Time**: 0.5 seconds
- **Actual Performance**: ~200ms with hardware acceleration
- **Throughput**: ~2 blocks per second
- **Finality**: Single block confirmation

### Hardware Requirements
- **CPU**: 8+ cores for validation nodes
- **Memory**: 16GB+ RAM for UTXO set
- **Storage**: 500GB+ SSD for blockchain data
- **GPU**: NVIDIA A100/H100 for competitive mining
- **FPGA**: Xilinx devices for maximum efficiency

## Integration with nuChain

### Coordination Layer
- zChain operates as a sidechain of nuChain L2
- Mining rewards coordinate with nuChain block production
- Cross-chain messaging for reward distribution
- Shared 0.5-second block time synchronization

### Reward Distribution
1. zChain miners solve hardware-accelerated zk-proofs
2. Successful proofs earn Z tokens + hardware bonuses
3. Mining activity contributes to nuChain's 0.5s block times
4. Cross-chain coordination ensures synchronized block production

## Security Model

### Proof-of-Work Security
- Hardware-accelerated zk-SNARK mining
- Difficulty adjustment maintains consistent block times
- Mining pool distribution prevents centralization
- Hardware diversity (GPU/FPGA) ensures decentralization

### Privacy Security
- zk-SNARK proofs provide computational privacy
- Nullifier tracking prevents double spending
- Commitment tree hides transaction graph
- Encrypted memos protect transaction metadata

### Hardware Security
- Hardware ID verification prevents proof replay
- Device-specific bonuses incentivize diverse hardware
- Cysic integration provides optimized proof generation
- Hardware acceleration creates competitive advantages

## Deployment Architecture

### Node Types
1. **Mining Nodes**: Generate zk-proofs, earn rewards
2. **Validation Nodes**: Verify proofs, maintain consensus
3. **Full Nodes**: Store complete UTXO set and transaction history
4. **Light Nodes**: SPV-style verification for mobile/embedded use

### Mining Pool Architecture
- **Pool Operators**: Coordinate mining efforts, distribute rewards
- **Pool Miners**: Contribute hash power, receive proportional rewards
- **Hardware Diversity**: Support for multiple acceleration platforms
- **Reward Sharing**: Configurable fee structures and payout thresholds

## API Endpoints

### Transaction APIs
- `POST /utxo/send` - Submit UTXO transaction
- `POST /utxo/send-shielded` - Submit shielded transaction
- `POST /utxo/mining-proof` - Submit mining proof
- `GET /utxo/{hash}` - Get UTXO by transaction hash
- `GET /utxo/balance/{address}` - Get address balance

### Mining APIs
- `GET /mining/difficulty` - Current mining difficulty
- `GET /mining/stats` - Mining statistics and performance
- `GET /mining/hardware` - Supported hardware devices
- `POST /mining/pool/join` - Join mining pool
- `GET /mining/rewards/{address}` - Mining reward history

This architecture enables zChain to serve as an efficient UTXO sidechain that provides hardware-accelerated mining rewards while maintaining privacy features and coordinating with nuChain's L2 operations.