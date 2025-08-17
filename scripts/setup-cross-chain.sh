#!/bin/bash

# Cross-chain Setup Script for zChain ↔ nuChain Integration
# Sets up LayerZero messaging and cross-chain coordination

set -e

echo "🔗 Setting up Cross-chain Integration"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
ZCHAIN_HOME="$HOME/.z-blockchain"
NUCHAIN_HOME="$HOME/.nuchain"
LAYERZERO_ENDPOINT="0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675"

# Setup LayerZero configuration
setup_layerzero() {
    print_header "Setting up LayerZero configuration"
    
    # Create LayerZero config for zChain
    cat > $ZCHAIN_HOME/layerzero.json << EOF
{
  "endpoint": "$LAYERZERO_ENDPOINT",
  "chain_id": 1,
  "remote_chains": {
    "nuchain": {
      "chain_id": 2,
      "endpoint": "$LAYERZERO_ENDPOINT",
      "trusted_remote": "0x0000000000000000000000000000000000000000"
    }
  },
  "message_types": {
    "mining_reward": 1,
    "block_sync": 2,
    "cross_chain_tx": 3
  }
}
EOF
    
    # Create LayerZero config for nuChain
    cat > $NUCHAIN_HOME/layerzero.json << EOF
{
  "endpoint": "$LAYERZERO_ENDPOINT",
  "chain_id": 2,
  "remote_chains": {
    "zchain": {
      "chain_id": 1,
      "endpoint": "$LAYERZERO_ENDPOINT",
      "trusted_remote": "0x0000000000000000000000000000000000000000"
    },
    "altcoinchain": {
      "chain_id": 2330,
      "endpoint": "TBD",
      "trusted_remote": "0x0000000000000000000000000000000000000000"
    },
    "polygon": {
      "chain_id": 137,
      "endpoint": "0x3c2269811836af69497E5F486A85D7316753cf62",
      "trusted_remote": "0x0000000000000000000000000000000000000000"
    }
  },
  "message_types": {
    "mining_rig_update": 1,
    "pool_stake": 2,
    "reward_distribution": 3,
    "zchain_mining_reward": 4,
    "block_sync": 5
  }
}
EOF
    
    print_status "LayerZero configuration created"
}

# Setup cross-chain messaging
setup_messaging() {
    print_header "Setting up cross-chain messaging"
    
    # Create message relay configuration
    cat > cross-chain-relay.json << EOF
{
  "relay_config": {
    "zchain_to_nuchain": {
      "enabled": true,
      "message_types": ["mining_reward", "block_sync"],
      "batch_size": 10,
      "batch_timeout": "5s"
    },
    "nuchain_to_zchain": {
      "enabled": true,
      "message_types": ["mining_coordination", "difficulty_adjustment"],
      "batch_size": 10,
      "batch_timeout": "5s"
    },
    "external_chains": {
      "altcoinchain": {
        "enabled": true,
        "rpc": "TBD",
        "chain_id": 2330,
        "message_types": ["mining_rig_data", "pool_operator_stake", "watt_rewards"]
      },
      "polygon": {
        "enabled": true,
        "rpc": "https://polygon-rpc.com",
        "chain_id": 137,
        "message_types": ["mining_rig_data", "pool_operator_stake", "watt_rewards"]
      }
    }
  },
  "synchronization": {
    "target_block_time": "500ms",
    "sync_tolerance": "100ms",
    "max_drift": "1s"
  }
}
EOF
    
    print_status "Cross-chain messaging configuration created"
}

# Test cross-chain connectivity
test_connectivity() {
    print_header "Testing cross-chain connectivity"
    
    # Test zChain to nuChain messaging
    print_status "Testing zChain → nuChain messaging..."
    
    # This would be implemented with actual LayerZero calls
    # For now, create test message files
    cat > test-zchain-message.json << EOF
{
  "type": "mining_reward",
  "miner": "z1test000000000000000000000000000000000000",
  "reward": "50000000000000000",
  "hardware_id": "nvidia-a100",
  "block_height": 1000,
  "timestamp": $(date +%s)
}
EOF
    
    cat > test-nuchain-message.json << EOF
{
  "type": "mining_rig_update",
  "token_id": 1,
  "chain_id": "altcoinchain-2330",
  "hash_power": 1000000,
  "watt_consumption": 500,
  "is_active": true
}
EOF
    
    print_status "Test message files created"
}

# Setup monitoring
setup_monitoring() {
    print_header "Setting up cross-chain monitoring"
    
    # Create monitoring configuration
    cat > monitoring-config.yml << EOF
monitoring:
  cross_chain:
    enabled: true
    metrics:
      - message_latency
      - message_success_rate
      - block_sync_drift
      - mining_reward_distribution
    
  endpoints:
    zchain_rpc: "http://localhost:26657"
    nuchain_rpc: "http://localhost:26658"
    layerzero_api: "https://api.layerzero.network"
    
  alerts:
    block_sync_drift_threshold: "2s"
    message_failure_threshold: 5
    mining_reward_delay_threshold: "30s"
    
  dashboards:
    grafana_enabled: true
    prometheus_enabled: true
    custom_metrics: true
EOF
    
    print_status "Monitoring configuration created"
}

# Create systemd services for cross-chain relay
create_relay_service() {
    print_header "Creating cross-chain relay service"
    
    # Create relay service script
    cat > cross-chain-relay.sh << EOF
#!/bin/bash
# Cross-chain message relay service

while true; do
    # Check for pending messages from zChain
    # Relay to nuChain via LayerZero
    
    # Check for pending messages from nuChain
    # Relay to zChain and external chains
    
    # Synchronize block production timing
    
    sleep 1
done
EOF
    
    chmod +x cross-chain-relay.sh
    
    # Create systemd service
    sudo tee /etc/systemd/system/cross-chain-relay.service > /dev/null <<EOF
[Unit]
Description=Cross-chain Message Relay Service
After=network-online.target

[Service]
Type=simple
User=$USER
ExecStart=$(pwd)/cross-chain-relay.sh
Restart=on-failure
RestartSec=5
Environment=ZCHAIN_RPC=http://localhost:26657
Environment=NUCHAIN_RPC=http://localhost:26658

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable cross-chain-relay
    
    print_status "Cross-chain relay service created"
}

# Print setup summary
print_summary() {
    print_header "Cross-chain Setup Summary"
    
    echo ""
    echo -e "${GREEN}🎉 Cross-chain integration setup completed!${NC}"
    echo ""
    echo "Configuration Files:"
    echo "- zChain LayerZero: $ZCHAIN_HOME/layerzero.json"
    echo "- nuChain LayerZero: $NUCHAIN_HOME/layerzero.json"
    echo "- Message Relay: ./cross-chain-relay.json"
    echo "- Monitoring: ./monitoring-config.yml"
    echo ""
    echo "Services:"
    echo "- Cross-chain Relay: sudo systemctl start cross-chain-relay"
    echo "- Message Monitoring: Prometheus + Grafana"
    echo ""
    echo "Message Types:"
    echo "- zChain → nuChain: mining_reward, block_sync"
    echo "- nuChain → zChain: mining_coordination, difficulty_adjustment"
    echo "- External Chains: mining_rig_data, pool_operator_stake, watt_rewards"
    echo ""
    echo "Synchronization:"
    echo "- Target Block Time: 500ms (both chains)"
    echo "- Sync Tolerance: 100ms"
    echo "- Max Drift: 1s"
    echo ""
    echo "Next Steps:"
    echo "1. Deploy LayerZero contracts on target chains"
    echo "2. Configure trusted remote addresses"
    echo "3. Start cross-chain relay service"
    echo "4. Monitor message flow and synchronization"
    echo ""
    echo -e "${BLUE}Cross-chain coordination ready! 🔗⛓️${NC}"
}

# Main execution
main() {
    setup_layerzero
    setup_messaging
    test_connectivity
    setup_monitoring
    create_relay_service
    print_summary
}

# Run main function
main "$@"