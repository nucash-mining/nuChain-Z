#!/bin/bash

# nuChain L2 Setup Script
# Sets up nuChain as a Cosmos SDK L2 zk-Rollup with Mining Game integration

set -e

echo "🚀 Setting up nuChain L2 zk-Rollup"
echo "=================================="

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
CHAIN_ID="nuchain-1"
MONIKER="nuchain-validator"
KEYRING_BACKEND="test"
HOME_DIR="$HOME/.nuchain"

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
    
    print_status "Prerequisites check passed"
}

# Initialize nuChain
init_nuchain() {
    print_header "Initializing nuChain"
    
    cd nuchain
    
    # Initialize the chain
    nuchaind init $MONIKER --chain-id $CHAIN_ID --home $HOME_DIR
    
    # Add validator key
    nuchaind keys add validator --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Add genesis account
    nuchaind add-genesis-account validator 1000000000000000000000nu --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Create genesis transaction
    nuchaind gentx validator 100000000000000000000nu --chain-id $CHAIN_ID --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Collect genesis transactions
    nuchaind collect-gentxs --home $HOME_DIR
    
    print_status "nuChain initialized successfully"
}

# Configure nuChain for L2 operations
configure_l2() {
    print_header "Configuring nuChain L2 settings"
    
    # Update config.toml for 0.5 second block times
    CONFIG_FILE="$HOME_DIR/config/config.toml"
    
    # Set consensus parameters for fast block times
    sed -i 's/timeout_commit = "5s"/timeout_commit = "200ms"/' $CONFIG_FILE
    sed -i 's/timeout_propose = "3s"/timeout_propose = "100ms"/' $CONFIG_FILE
    sed -i 's/timeout_prevote = "1s"/timeout_prevote = "100ms"/' $CONFIG_FILE
    sed -i 's/timeout_precommit = "1s"/timeout_precommit = "100ms"/' $CONFIG_FILE
    sed -i 's/create_empty_blocks_interval = "0s"/create_empty_blocks_interval = "200ms"/' $CONFIG_FILE
    
    # Update app.toml
    APP_CONFIG_FILE="$HOME_DIR/config/app.toml"
    sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.025nu"/' $APP_CONFIG_FILE
    
    print_status "L2 configuration completed"
}

# Setup cross-chain endpoints
setup_cross_chain() {
    print_header "Setting up cross-chain endpoints"
    
    # Create environment file for cross-chain configuration
    cat > $HOME_DIR/cross-chain.env << EOF
# Altcoinchain Configuration
ALTCOINCHAIN_RPC=https://rpc.altcoinchain.network
ALTCOINCHAIN_CHAIN_ID=altcoinchain-2330

# Polygon Configuration  
POLYGON_RPC=https://polygon-rpc.com
POLYGON_CHAIN_ID=polygon-137

# LayerZero Configuration
LAYERZERO_ENDPOINT=0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675

# Mining Game Contract Addresses
MINING_GAME_ALTCOINCHAIN=0x0000000000000000000000000000000000000000
MINING_GAME_POLYGON=0x0000000000000000000000000000000000000000

# WATT Token Addresses
WATT_TOKEN_ALTCOINCHAIN=0x0000000000000000000000000000000000000000
WATT_TOKEN_POLYGON=0x0000000000000000000000000000000000000000
EOF
    
    print_status "Cross-chain endpoints configured"
}

# Create systemd service
create_service() {
    print_header "Creating systemd service"
    
    sudo tee /etc/systemd/system/nuchaind.service > /dev/null <<EOF
[Unit]
Description=nuChain L2 zk-Rollup Node
After=network-online.target

[Service]
User=$USER
ExecStart=$(which nuchaind) start --home $HOME_DIR
Restart=on-failure
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable nuchaind
    
    print_status "Systemd service created"
}

# Start nuChain node
start_node() {
    print_header "Starting nuChain node"
    
    # Start the node in background
    nohup nuchaind start --home $HOME_DIR > $HOME_DIR/nuchain.log 2>&1 &
    
    # Wait for node to start
    sleep 5
    
    # Check if node is running
    if pgrep -f "nuchaind start" > /dev/null; then
        print_status "nuChain node started successfully"
        print_status "Logs: tail -f $HOME_DIR/nuchain.log"
        print_status "RPC: http://localhost:26657"
        print_status "API: http://localhost:1317"
    else
        print_error "Failed to start nuChain node"
        exit 1
    fi
}

# Test cross-chain messaging
test_cross_chain() {
    print_header "Testing cross-chain messaging"
    
    # Create a test mining rig update message
    nuchaind tx mining update-mining-rig \
        --token-id 1 \
        --chain-id "altcoinchain-2330" \
        --contract-address "0x0000000000000000000000000000000000000000" \
        --hash-power 1000000 \
        --watt-consumption 500 \
        --is-active true \
        --from validator \
        --keyring-backend $KEYRING_BACKEND \
        --home $HOME_DIR \
        --chain-id $CHAIN_ID \
        --yes
    
    print_status "Cross-chain messaging test completed"
}

# Create staking node
create_staking_node() {
    print_header "Creating staking node"
    
    # Create staking node with 21 NU minimum stake
    nuchaind tx mining create-staking-node \
        --moniker "nuchain-staker-1" \
        --supported-chains "altcoinchain-2330,polygon-137" \
        --from validator \
        --keyring-backend $KEYRING_BACKEND \
        --home $HOME_DIR \
        --chain-id $CHAIN_ID \
        --yes
    
    print_status "Staking node created"
}

# Print summary
print_summary() {
    print_header "Setup Summary"
    
    echo ""
    echo -e "${GREEN}🎉 nuChain L2 setup completed successfully!${NC}"
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
    echo "Cross-chain Integration:"
    echo "- Altcoinchain: Chain ID 2330"
    echo "- Polygon: Chain ID 137"
    echo "- LayerZero: Enabled for cross-chain messaging"
    echo ""
    echo "Key Features:"
    echo "- Block Time: 0.5 seconds (200ms timeout_commit)"
    echo "- Block Reward: 0.05 NU per block"
    echo "- Halving Interval: 210,000,000 blocks"
    echo "- Staking Requirement: 21 NU tokens"
    echo ""
    echo "Management Commands:"
    echo "- Start: nuchaind start --home $HOME_DIR"
    echo "- Status: nuchaind status --home $HOME_DIR"
    echo "- Logs: tail -f $HOME_DIR/nuchain.log"
    echo "- Service: sudo systemctl start nuchaind"
    echo ""
    echo "Next Steps:"
    echo "1. Configure Mining Game contract addresses in cross-chain.env"
    echo "2. Set up LayerZero endpoints for Altcoinchain and Polygon"
    echo "3. Deploy cross-chain relayer for mining rewards"
    echo "4. Connect zChain as UTXO sidechain for hardware mining"
    echo ""
    echo -e "${BLUE}Happy mining! ⛏️${NC}"
}

# Main execution
main() {
    check_prerequisites
    init_nuchain
    configure_l2
    setup_cross_chain
    create_service
    start_node
    sleep 3
    test_cross_chain
    create_staking_node
    print_summary
}

# Run main function
main "$@"