#!/bin/bash

# Z Blockchain & nuChain Deployment Script
# Supports testnet and mainnet deployments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-testnet}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }

# Validation
validate_environment() {
    if [[ "$ENVIRONMENT" != "testnet" && "$ENVIRONMENT" != "mainnet" ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [testnet|mainnet]"
        exit 1
    fi
    
    log_info "Deploying to: $ENVIRONMENT"
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking prerequisites"
    
    local missing_deps=()
    
    command -v go >/dev/null 2>&1 || missing_deps+=("go")
    command -v node >/dev/null 2>&1 || missing_deps+=("node")
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v ignite >/dev/null 2>&1 || missing_deps+=("ignite")
    
    if [[ ${#missing_deps[@]} -ne 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please run: ./scripts/setup.sh"
        exit 1
    fi
    
    log_info "All prerequisites satisfied"
}

# Load configuration
load_config() {
    log_header "Loading configuration"
    
    if [[ "$ENVIRONMENT" == "testnet" ]]; then
        export Z_CHAIN_ID="z-blockchain-testnet-1"
        export NU_CHAIN_ID="nuchain-testnet-1"
        export Z_VALIDATOR_COUNT=4
        export NU_VALIDATOR_COUNT=4
        export BLOCK_TIME="500ms"
        export MIN_GAS_PRICE="0.025"
    else
        export Z_CHAIN_ID="z-blockchain-1"
        export NU_CHAIN_ID="nuchain-1"
        export Z_VALIDATOR_COUNT=10
        export NU_VALIDATOR_COUNT=10
        export BLOCK_TIME="500ms"
        export MIN_GAS_PRICE="0.025"
    fi
    
    log_info "Configuration loaded for $ENVIRONMENT"
    log_info "Z Chain ID: $Z_CHAIN_ID"
    log_info "NU Chain ID: $NU_CHAIN_ID"
}

# Build chains
build_chains() {
    log_header "Building blockchain binaries"
    
    cd "$PROJECT_DIR"
    
    # Build Z Blockchain
    log_info "Building Z Blockchain..."
    cd z-blockchain
    ignite chain build --release
    cd ..
    
    # Build nuChain
    log_info "Building nuChain..."
    cd nuchain
    ignite chain build --release
    cd ..
    
    log_info "Blockchain binaries built successfully"
}

# Generate genesis files
generate_genesis() {
    log_header "Generating genesis files"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Z Blockchain genesis
    cat > "$PROJECT_DIR/z-blockchain/config/genesis.json" << EOF
{
  "genesis_time": "$timestamp",
  "chain_id": "$Z_CHAIN_ID",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "-1",
      "time_iota_ms": "200"
    },
    "evidence": {
      "max_age_num_blocks": "100000",
      "max_age_duration": "172800000000000",
      "max_bytes": "1048576"
    },
    "validator": {
      "pub_key_types": ["ed25519"]
    },
    "version": {}
  },
  "app_hash": "",
  "app_state": {
    "auth": {
      "params": {
        "max_memo_characters": "512",
        "tx_sig_limit": "7",
        "tx_size_cost_per_byte": "10",
        "sig_verify_cost_ed25519": "590",
        "sig_verify_cost_secp256k1": "1000"
      },
      "accounts": []
    },
    "bank": {
      "params": {
        "send_enabled": [],
        "default_send_enabled": true
      },
      "balances": [],
      "supply": [],
      "denom_metadata": [
        {
          "description": "Z Token - Native token of Z Blockchain",
          "denom_units": [
            {
              "denom": "uz",
              "exponent": 0,
              "aliases": ["microz"]
            },
            {
              "denom": "z",
              "exponent": 18,
              "aliases": ["Z"]
            }
          ],
          "base": "uz",
          "display": "z",
          "name": "Z Token",
          "symbol": "Z",
          "uri": "",
          "uri_hash": ""
        }
      ]
    },
    "pow": {
      "params": {
        "block_reward": "50000000000000000",
        "halving_interval": "210000000",
        "difficulty_adjustment_interval": "2016",
        "target_block_time": "500ms"
      },
      "validators": [],
      "difficulty": "1000000",
      "last_block_height": "0"
    },
    "staking": {
      "params": {
        "unbonding_time": "1814400s",
        "max_validators": 100,
        "max_entries": 7,
        "historical_entries": 10000,
        "bond_denom": "uz",
        "min_commission_rate": "0.000000000000000000"
      },
      "last_total_power": "0",
      "last_validator_powers": [],
      "validators": [],
      "delegations": [],
      "unbonding_delegations": [],
      "redelegations": [],
      "exported": false
    }
  }
}
EOF
    
    # nuChain genesis (similar structure with NU token)
    cat > "$PROJECT_DIR/nuchain/config/genesis.json" << EOF
{
  "genesis_time": "$timestamp",
  "chain_id": "$NU_CHAIN_ID",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "-1",
      "time_iota_ms": "200"
    },
    "evidence": {
      "max_age_num_blocks": "100000",
      "max_age_duration": "172800000000000",
      "max_bytes": "1048576"
    },
    "validator": {
      "pub_key_types": ["ed25519"]
    },
    "version": {}
  },
  "app_hash": "",
  "app_state": {
    "auth": {
      "params": {
        "max_memo_characters": "512",
        "tx_sig_limit": "7",
        "tx_size_cost_per_byte": "10",
        "sig_verify_cost_ed25519": "590",
        "sig_verify_cost_secp256k1": "1000"
      },
      "accounts": []
    },
    "bank": {
      "params": {
        "send_enabled": [],
        "default_send_enabled": true
      },
      "balances": [],
      "supply": [],
      "denom_metadata": [
        {
          "description": "NU Token - Native token of nuChain",
          "denom_units": [
            {
              "denom": "unu",
              "exponent": 0,
              "aliases": ["micronu"]
            },
            {
              "denom": "nu",
              "exponent": 18,
              "aliases": ["NU"]
            }
          ],
          "base": "unu",
          "display": "nu",
          "name": "NU Token",
          "symbol": "NU",
          "uri": "",
          "uri_hash": ""
        }
      ]
    },
    "pow": {
      "params": {
        "block_reward": "50000000000000000",
        "halving_interval": "210000000",
        "difficulty_adjustment_interval": "2016",
        "target_block_time": "500ms"
      },
      "validators": [],
      "difficulty": "1000000",
      "last_block_height": "0"
    }
  }
}
EOF
    
    log_info "Genesis files generated"
}

# Setup validators
setup_validators() {
    log_header "Setting up validators"
    
    cd "$PROJECT_DIR"
    
    # Create validator keys for Z Blockchain
    log_info "Creating Z Blockchain validators..."
    for i in $(seq 1 $Z_VALIDATOR_COUNT); do
        validator_dir="$PROJECT_DIR/data/z-blockchain/validator$i"
        mkdir -p "$validator_dir"
        
        # Initialize validator node
        z-blockchaind init "validator$i" --chain-id "$Z_CHAIN_ID" --home "$validator_dir"
        
        # Generate validator key
        z-blockchaind keys add "validator$i" --keyring-backend test --home "$validator_dir"
        
        # Create gentx
        z-blockchaind gentx "validator$i" 1000000uz \
            --chain-id "$Z_CHAIN_ID" \
            --keyring-backend test \
            --home "$validator_dir"
    done
    
    # Create validator keys for nuChain
    log_info "Creating nuChain validators..."
    for i in $(seq 1 $NU_VALIDATOR_COUNT); do
        validator_dir="$PROJECT_DIR/data/nuchain/validator$i"
        mkdir -p "$validator_dir"
        
        # Initialize validator node
        nuchaind init "validator$i" --chain-id "$NU_CHAIN_ID" --home "$validator_dir"
        
        # Generate validator key
        nuchaind keys add "validator$i" --keyring-backend test --home "$validator_dir"
        
        # Create gentx
        nuchaind gentx "validator$i" 1000000unu \
            --chain-id "$NU_CHAIN_ID" \
            --keyring-backend test \
            --home "$validator_dir"
    done
    
    log_info "Validators configured"
}

# Deploy smart contracts
deploy_contracts() {
    log_header "Deploying smart contracts"
    
    cd "$PROJECT_DIR/contracts"
    
    # Install dependencies
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing contract dependencies..."
        npm install
    fi
    
    # Compile contracts
    log_info "Compiling smart contracts..."
    npx hardhat compile
    
    # Deploy to appropriate network
    if [[ "$ENVIRONMENT" == "testnet" ]]; then
        log_info "Deploying to testnet..."
        npx hardhat run scripts/deploy.js --network goerli
    else
        log_warn "Mainnet deployment requires manual confirmation"
        read -p "Are you sure you want to deploy to mainnet? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx hardhat run scripts/deploy.js --network mainnet
        else
            log_info "Mainnet deployment cancelled"
            return
        fi
    fi
    
    log_info "Smart contracts deployed"
}

# Start blockchain nodes
start_nodes() {
    log_header "Starting blockchain nodes"
    
    cd "$PROJECT_DIR"
    
    # Start Z Blockchain nodes
    log_info "Starting Z Blockchain validators..."
    for i in $(seq 1 $Z_VALIDATOR_COUNT); do
        validator_dir="$PROJECT_DIR/data/z-blockchain/validator$i"
        log_info "Starting Z Blockchain validator $i..."
        
        # Start in background
        nohup z-blockchaind start \
            --home "$validator_dir" \
            --rpc.laddr "tcp://0.0.0.0:$((26656 + i))" \
            --p2p.laddr "tcp://0.0.0.0:$((26655 + i))" \
            --api.enable \
            --api.enabled-unsafe-cors \
            > "$PROJECT_DIR/logs/z-blockchain-validator$i.log" 2>&1 &
        
        echo $! > "$PROJECT_DIR/data/z-blockchain/validator$i.pid"
        sleep 2
    done
    
    # Start nuChain nodes
    log_info "Starting nuChain validators..."
    for i in $(seq 1 $NU_VALIDATOR_COUNT); do
        validator_dir="$PROJECT_DIR/data/nuchain/validator$i"
        log_info "Starting nuChain validator $i..."
        
        # Start in background
        nohup nuchaind start \
            --home "$validator_dir" \
            --rpc.laddr "tcp://0.0.0.0:$((26656 + 100 + i))" \
            --p2p.laddr "tcp://0.0.0.0:$((26655 + 100 + i))" \
            --api.enable \
            --api.enabled-unsafe-cors \
            > "$PROJECT_DIR/logs/nuchain-validator$i.log" 2>&1 &
        
        echo $! > "$PROJECT_DIR/data/nuchain/validator$i.pid"
        sleep 2
    done
    
    log_info "All nodes started successfully"
}

# Health check
health_check() {
    log_header "Performing health check"
    
    local errors=0
    
    # Check Z Blockchain nodes
    log_info "Checking Z Blockchain nodes..."
    for i in $(seq 1 $Z_VALIDATOR_COUNT); do
        local rpc_port=$((26656 + i))
        if curl -s "http://localhost:$rpc_port/status" > /dev/null; then
            log_info "✓ Z Blockchain validator $i is healthy"
        else
            log_error "✗ Z Blockchain validator $i is not responding"
            ((errors++))
        fi
    done
    
    # Check nuChain nodes
    log_info "Checking nuChain nodes..."
    for i in $(seq 1 $NU_VALIDATOR_COUNT); do
        local rpc_port=$((26656 + 100 + i))
        if curl -s "http://localhost:$rpc_port/status" > /dev/null; then
            log_info "✓ nuChain validator $i is healthy"
        else
            log_error "✗ nuChain validator $i is not responding"
            ((errors++))
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        log_info "🎉 All nodes are healthy!"
        return 0
    else
        log_error "❌ $errors node(s) failed health check"
        return 1
    fi
}

# Create monitoring setup
setup_monitoring() {
    log_header "Setting up monitoring"
    
    # Create Prometheus config
    cat > "$PROJECT_DIR/monitoring/prometheus.yml" << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'z-blockchain'
    static_configs:
      - targets: ['localhost:26660', 'localhost:26661', 'localhost:26662', 'localhost:26663']
  
  - job_name: 'nuchain'
    static_configs:
      - targets: ['localhost:26760', 'localhost:26761', 'localhost:26762', 'localhost:26763']
EOF
    
    # Create Docker Compose for monitoring
    cat > "$PROJECT_DIR/docker-compose.monitoring.yml" << EOF
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: blockchain-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: blockchain-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
EOF
    
    log_info "Monitoring setup created. Run 'docker-compose -f docker-compose.monitoring.yml up -d' to start"
}

# Print deployment summary
print_summary() {
    log_header "Deployment Summary"
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Z Blockchain Chain ID: $Z_CHAIN_ID"
    echo "nuChain Chain ID: $NU_CHAIN_ID"
    echo ""
    echo "RPC Endpoints:"
    echo "- Z Blockchain: http://localhost:26657"
    echo "- nuChain: http://localhost:26757"
    echo ""
    echo "API Endpoints:"
    echo "- Z Blockchain: http://localhost:1317"
    echo "- nuChain: http://localhost:1417"
    echo ""
    echo "Log files:"
    echo "- Z Blockchain: ./logs/z-blockchain-validator*.log"
    echo "- nuChain: ./logs/nuchain-validator*.log"
    echo ""
    echo "Management commands:"
    echo "- Stop nodes: ./scripts/stop.sh"
    echo "- View logs: tail -f logs/*.log"
    echo "- Health check: ./scripts/health-check.sh"
    echo ""
    echo -e "${BLUE}Happy mining! ⛏️${NC}"
}

# Cleanup function
cleanup() {
    log_error "Deployment interrupted"
    # Stop any running processes
    pkill -f "z-blockchaind" 2>/dev/null || true
    pkill -f "nuchaind" 2>/dev/null || true
    exit 1
}

# Main deployment flow
main() {
    trap cleanup INT
    
    log_header "Starting deployment process"
    
    validate_environment
    check_prerequisites
    load_config
    build_chains
    generate_genesis
    setup_validators
    deploy_contracts
    start_nodes
    
    # Wait a few seconds for nodes to stabilize
    sleep 10
    
    if health_check; then
        setup_monitoring
        print_summary
        exit 0
    else
        log_error "Deployment completed with errors"
        exit 1
    fi
}

# Run main function
main "$@"