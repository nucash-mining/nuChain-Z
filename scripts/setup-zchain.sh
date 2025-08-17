#!/bin/bash

# zChain UTXO Sidechain Setup Script
# Sets up zChain as a UTXO blockchain with hardware-accelerated zk-proof mining

set -e

echo "🚀 Setting up zChain UTXO Sidechain"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
CHAIN_ID="z-blockchain-1"
MONIKER="zchain-miner"
KEYRING_BACKEND="test"
HOME_DIR="$HOME/.z-blockchain"

# Check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites"
    
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go 1.21+"
        exit 1
    fi
    
    if ! command -v ignite &> /dev/null; then
        print_error "Ignite CLI is not installed. Please install Ignite CLI"
        exit 1
    fi
    
    # Check for hardware acceleration support
    if command -v nvidia-smi &> /dev/null; then
        print_status "NVIDIA GPU detected for hardware acceleration"
    else
        print_warning "No NVIDIA GPU detected. Hardware acceleration may be limited"
    fi
    
    print_status "Prerequisites check passed"
}

# Initialize zChain
init_zchain() {
    print_header "Initializing zChain UTXO blockchain"
    
    cd z-blockchain
    
    # Initialize the chain
    z-blockchaind init $MONIKER --chain-id $CHAIN_ID --home $HOME_DIR
    
    # Add miner key
    z-blockchaind keys add miner --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Add genesis account with Z tokens
    z-blockchaind add-genesis-account miner 1000000000000000000000z --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Create genesis transaction
    z-blockchaind gentx miner 100000000000000000000z --chain-id $CHAIN_ID --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Collect genesis transactions
    z-blockchaind collect-gentxs --home $HOME_DIR
    
    print_status "zChain initialized successfully"
}

# Configure UTXO blockchain settings
configure_utxo() {
    print_header "Configuring UTXO blockchain settings"
    
    # Update config.toml for 0.5 second block times
    CONFIG_FILE="$HOME_DIR/config/config.toml"
    
    # Set consensus parameters for fast block times
    sed -i 's/timeout_commit = "5s"/timeout_commit = "200ms"/' $CONFIG_FILE
    sed -i 's/timeout_propose = "3s"/timeout_propose = "100ms"/' $CONFIG_FILE
    sed -i 's/timeout_prevote = "1s"/timeout_prevote = "100ms"/' $CONFIG_FILE
    sed -i 's/timeout_precommit = "1s"/timeout_precommit = "100ms"/' $CONFIG_FILE
    sed -i 's/create_empty_blocks_interval = "0s"/create_empty_blocks_interval = "200ms"/' $CONFIG_FILE
    
    # Optimize mempool for UTXO transactions
    sed -i 's/size = 5000/size = 10000/' $CONFIG_FILE
    sed -i 's/max_txs_bytes = 1073741824/max_txs_bytes = 2147483648/' $CONFIG_FILE
    sed -i 's/cache_size = 10000/cache_size = 20000/' $CONFIG_FILE
    
    # Update app.toml
    APP_CONFIG_FILE="$HOME_DIR/config/app.toml"
    sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.001z"/' $APP_CONFIG_FILE
    
    print_status "UTXO configuration completed"
}

# Setup hardware acceleration
setup_hardware_acceleration() {
    print_header "Setting up hardware acceleration"
    
    # Create hardware configuration file
    cat > $HOME_DIR/hardware.env << EOF
# Hardware Acceleration Configuration
HARDWARE_ACCELERATION_ENABLED=true

# Supported Hardware Devices
NVIDIA_A100_ENABLED=true
NVIDIA_H100_ENABLED=true
XILINX_FPGA_ENABLED=true

# Mining Configuration
ZK_PROOF_ACCELERATION=true
CYSIC_INTEGRATION=true
HARDWARE_BONUS_ENABLED=true

# Performance Settings
MAX_CONCURRENT_PROOFS=10
PROOF_TIMEOUT_MS=30000
HARDWARE_PRIORITY=high
EOF
    
    # Check for CUDA support
    if command -v nvcc &> /dev/null; then
        print_status "CUDA compiler detected - hardware acceleration ready"
        echo "CUDA_ENABLED=true" >> $HOME_DIR/hardware.env
    else
        print_warning "CUDA compiler not found - install NVIDIA CUDA Toolkit for optimal performance"
        echo "CUDA_ENABLED=false" >> $HOME_DIR/hardware.env
    fi
    
    print_status "Hardware acceleration configured"
}

# Create mining pool configuration
create_mining_pool() {
    print_header "Creating mining pool configuration"
    
    # Create mining pool config
    cat > $HOME_DIR/mining-pool.json << EOF
{
  "pool_name": "zChain Hardware Mining Pool",
  "pool_address": "z1mining000000000000000000000000000000000",
  "fee_percentage": 2.5,
  "payout_threshold": "1000000000000000000",
  "supported_hardware": [
    "nvidia-a100",
    "nvidia-h100", 
    "xilinx-fpga"
  ],
  "zk_proof_method": "cysic",
  "difficulty_adjustment": {
    "target_block_time_ms": 500,
    "adjustment_interval": 2016,
    "max_adjustment_factor": 4
  },
  "rewards": {
    "base_reward": "50000000000000000",
    "hardware_bonus": {
      "nvidia-a100": "5000000000000000",
      "nvidia-h100": "10000000000000000",
      "xilinx-fpga": "15000000000000000"
    },
    "halving_interval": 210000000
  }
}
EOF
    
    print_status "Mining pool configuration created"
}

# Create systemd service
create_service() {
    print_header "Creating systemd service"
    
    sudo tee /etc/systemd/system/z-blockchaind.service > /dev/null <<EOF
[Unit]
Description=zChain UTXO Sidechain Node
After=network-online.target

[Service]
User=$USER
ExecStart=$(which z-blockchaind) start --home $HOME_DIR
Restart=on-failure
RestartSec=3
LimitNOFILE=65535
Environment=HARDWARE_ACCELERATION=true

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable z-blockchaind
    
    print_status "Systemd service created"
}

# Start zChain node
start_node() {
    print_header "Starting zChain node"
    
    # Start the node in background
    nohup z-blockchaind start --home $HOME_DIR > $HOME_DIR/zchain.log 2>&1 &
    
    # Wait for node to start
    sleep 5
    
    # Check if node is running
    if pgrep -f "z-blockchaind start" > /dev/null; then
        print_status "zChain node started successfully"
        print_status "Logs: tail -f $HOME_DIR/zchain.log"
        print_status "RPC: http://localhost:26657"
        print_status "API: http://localhost:1317"
    else
        print_error "Failed to start zChain node"
        exit 1
    fi
}

# Test UTXO transactions
test_utxo_transactions() {
    print_header "Testing UTXO transactions"
    
    # Create a test UTXO transaction
    z-blockchaind tx utxo send-utxo \
        --inputs '[{"prev_tx_hash":"0000000000000000000000000000000000000000000000000000000000000000","prev_output_index":0,"script_sig":"","witness":""}]' \
        --outputs '[{"amount":"1000000000000000000","script_pubkey":"","address":"z1test000000000000000000000000000000000000"}]' \
        --fee "1000000000000000" \
        --lock-time 0 \
        --from miner \
        --keyring-backend $KEYRING_BACKEND \
        --home $HOME_DIR \
        --chain-id $CHAIN_ID \
        --yes
    
    print_status "UTXO transaction test completed"
}

# Test hardware mining
test_hardware_mining() {
    print_header "Testing hardware mining"
    
    # Submit a test mining proof
    z-blockchaind tx utxo submit-mining-proof \
        --zk-proof "0x1234567890abcdef" \
        --public-inputs "0xfedcba0987654321" \
        --nonce 12345 \
        --difficulty 1000000 \
        --hardware-id "nvidia-a100" \
        --from miner \
        --keyring-backend $KEYRING_BACKEND \
        --home $HOME_DIR \
        --chain-id $CHAIN_ID \
        --yes
    
    print_status "Hardware mining test completed"
}

# Print summary
print_summary() {
    print_header "Setup Summary"
    
    echo ""
    echo -e "${GREEN}🎉 zChain UTXO sidechain setup completed successfully!${NC}"
    echo ""
    echo "Chain Information:"
    echo "- Chain ID: $CHAIN_ID"
    echo "- Home Directory: $HOME_DIR"
    echo "- Moniker: $MONIKER"
    echo ""
    echo "Network Endpoints:"
    echo "- RPC: http://localhost:26657"
    echo "- API: http://localhost:1317"
    echo "- gRPC: localhost:9090"
    echo ""
    echo "UTXO Features:"
    echo "- Block Time: 0.5 seconds (200ms timeout_commit)"
    echo "- Block Reward: 0.05 Z per block"
    echo "- Halving Interval: 210,000,000 blocks"
    echo "- Hardware Acceleration: Enabled"
    echo ""
    echo "Hardware Support:"
    echo "- NVIDIA A100: +0.005 Z bonus per block"
    echo "- NVIDIA H100: +0.01 Z bonus per block"
    echo "- Xilinx FPGA: +0.015 Z bonus per block"
    echo ""
    echo "Privacy Features:"
    echo "- Shielded Transactions: Zcash-style privacy"
    echo "- 512-byte Encrypted Memos: Supported"
    echo "- zk-SNARK Proofs: Cysic integration"
    echo ""
    echo "Management Commands:"
    echo "- Start: z-blockchaind start --home $HOME_DIR"
    echo "- Status: z-blockchaind status --home $HOME_DIR"
    echo "- Logs: tail -f $HOME_DIR/zchain.log"
    echo "- Service: sudo systemctl start z-blockchaind"
    echo ""
    echo "Transaction Commands:"
    echo "- Send UTXO: z-blockchaind tx utxo send-utxo"
    echo "- Send Shielded: z-blockchaind tx utxo send-shielded"
    echo "- Submit Mining Proof: z-blockchaind tx utxo submit-mining-proof"
    echo ""
    echo "Next Steps:"
    echo "1. Connect to nuChain L2 for cross-chain coordination"
    echo "2. Configure hardware acceleration for optimal mining"
    echo "3. Join mining pools for collaborative mining"
    echo "4. Set up monitoring and alerting for node health"
    echo ""
    echo -e "${BLUE}Happy mining with hardware acceleration! ⚡⛏️${NC}"
}

# Main execution
main() {
    check_prerequisites
    init_zchain
    configure_utxo
    setup_hardware_acceleration
    create_mining_pool
    create_service
    start_node
    sleep 3
    test_utxo_transactions
    test_hardware_mining
    print_summary
}

# Run main function
main "$@"