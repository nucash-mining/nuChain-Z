#!/bin/bash

# Oracle System Deployment Script
# Deploys zk-rollup L2 oracle for Mining Game NFT → nuChain integration

set -e

echo "🚀 Deploying zk-rollup L2 Oracle System"
echo "======================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }

# Configuration
ALTCOINCHAIN_CHAIN_ID=2330
POLYGON_CHAIN_ID=137
NUCHAIN_CHAIN_ID="nuchain-1"
ZCHAIN_CHAIN_ID="z-blockchain-1"

# Contract addresses (update with actual addresses)
MINING_GAME_ALTCOINCHAIN="0xf9670e5D46834561813CA79854B3d7147BBbFfb2"
WATT_TOKEN_ALTCOINCHAIN="0x6645143e49B3a15d8F205658903a55E520444698"
MINING_GAME_POLYGON="0x970a8b10147e3459d3cbf56329b76ac18d329728"
WATT_TOKEN_POLYGON="0xE960d5076cd3169C343Ee287A2c3380A222e5839"

# Check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites"
    
    local missing_deps=()
    
    command -v node >/dev/null 2>&1 || missing_deps+=("node")
    command -v python3 >/dev/null 2>&1 || missing_deps+=("python3")
    command -v go >/dev/null 2>&1 || missing_deps+=("go")
    command -v ignite >/dev/null 2>&1 || missing_deps+=("ignite")
    
    if [[ ${#missing_deps[@]} -ne 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    print_status "All prerequisites satisfied"
}

# Deploy oracle contracts
deploy_oracle_contracts() {
    print_header "Deploying oracle contracts"
    
    cd contracts
    
    # Install dependencies
    if [[ ! -d "node_modules" ]]; then
        print_status "Installing contract dependencies..."
        npm install
    fi
    
    # Compile contracts
    print_status "Compiling oracle contracts..."
    npx hardhat compile
    
    # Deploy to Altcoinchain
    print_status "Deploying to Altcoinchain (Chain ID: $ALTCOINCHAIN_CHAIN_ID)..."
    cat > scripts/deploy-oracle-altcoinchain.js << EOF
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Altcoinchain with:", deployer.address);
  
  // Deploy CysicZkOracle
  const CysicZkOracle = await ethers.getContractFactory("CysicZkOracle");
  const oracle = await CysicZkOracle.deploy(
    "$MINING_GAME_ALTCOINCHAIN",
    "$WATT_TOKEN_ALTCOINCHAIN",
    "0x0000000000000000000000000000000000000001" // Cysic verifier placeholder
  );
  await oracle.deployed();
  
  console.log("CysicZkOracle deployed to:", oracle.address);
  
  // Save deployment info
  const fs = require('fs');
  const deployment = {
    network: "altcoinchain",
    chainId: $ALTCOINCHAIN_CHAIN_ID,
    contracts: {
      cysicZkOracle: oracle.address,
      miningGameNFTs: "$MINING_GAME_ALTCOINCHAIN",
      wattToken: "$WATT_TOKEN_ALTCOINCHAIN"
    }
  };
  
  fs.writeFileSync('./deployments/oracle-altcoinchain.json', JSON.stringify(deployment, null, 2));
}

main().catch(console.error);
EOF
    
    # Deploy to Polygon
    print_status "Deploying to Polygon (Chain ID: $POLYGON_CHAIN_ID)..."
    cat > scripts/deploy-oracle-polygon.js << EOF
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Polygon with:", deployer.address);
  
  // Deploy CysicZkOracle
  const CysicZkOracle = await ethers.getContractFactory("CysicZkOracle");
  const oracle = await CysicZkOracle.deploy(
    "$MINING_GAME_POLYGON",
    "$WATT_TOKEN_POLYGON",
    "0x0000000000000000000000000000000000000002" // Cysic verifier placeholder
  );
  await oracle.deployed();
  
  console.log("CysicZkOracle deployed to:", oracle.address);
  
  // Save deployment info
  const fs = require('fs');
  const deployment = {
    network: "polygon",
    chainId: $POLYGON_CHAIN_ID,
    contracts: {
      cysicZkOracle: oracle.address,
      miningGameNFTs: "$MINING_GAME_POLYGON",
      wattToken: "$WATT_TOKEN_POLYGON"
    }
  };
  
  fs.writeFileSync('./deployments/oracle-polygon.json', JSON.stringify(deployment, null, 2));
}

main().catch(console.error);
EOF
    
    # Execute deployments (when ready)
    print_warning "Oracle contracts ready for deployment"
    print_status "Run: npx hardhat run scripts/deploy-oracle-altcoinchain.js --network altcoinchain"
    print_status "Run: npx hardhat run scripts/deploy-oracle-polygon.js --network polygon"
    
    cd ..
}

# Setup nuChain with oracle module
setup_nuchain_oracle() {
    print_header "Setting up nuChain with oracle module"
    
    cd nuchain
    
    # Add oracle module to nuChain
    print_status "Configuring nuChain oracle integration..."
    
    # Update app.go to include oracle module
    cat >> x/oracle/module.go << EOF
package oracle

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/cosmos/cosmos-sdk/client"
    "github.com/cosmos/cosmos-sdk/codec"
    cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
    sdk "github.com/cosmos/cosmos-sdk/types"
    "github.com/cosmos/cosmos-sdk/types/module"
    "github.com/grpc-ecosystem/grpc-gateway/runtime"
    "github.com/spf13/cobra"
    abci "github.com/tendermint/tendermint/abci/types"

    "nuchain/x/oracle/keeper"
    "nuchain/x/oracle/types"
)

// Oracle module for cross-chain mining data
var (
    _ module.AppModule      = AppModule{}
    _ module.AppModuleBasic = AppModuleBasic{}
)

type AppModuleBasic struct {
    cdc codec.BinaryCodec
}

type AppModule struct {
    AppModuleBasic
    keeper keeper.Keeper
}

func NewAppModule(cdc codec.BinaryCodec, keeper keeper.Keeper) AppModule {
    return AppModule{
        AppModuleBasic: AppModuleBasic{cdc: cdc},
        keeper:         keeper,
    }
}

// EndBlocker processes oracle data and distributes rewards
func (am AppModule) EndBlock(ctx sdk.Context, _ abci.RequestEndBlock) []abci.ValidatorUpdate {
    // Process cross-chain mining data
    am.keeper.ProcessBlockRewards(ctx)
    return []abci.ValidatorUpdate{}
}
EOF
    
    print_status "nuChain oracle module configured"
    cd ..
}

# Setup zChain UTXO sidechain
setup_zchain_utxo() {
    print_header "Setting up zChain UTXO sidechain"
    
    cd z-blockchain
    
    # Configure UTXO module for hardware mining
    print_status "Configuring zChain UTXO hardware mining..."
    
    # Update genesis configuration
    cat > config/hardware-mining.json << EOF
{
  "hardware_mining": {
    "enabled": true,
    "asic_resistant": true,
    "supported_devices": [
      "nvidia-rtx-3080", "nvidia-rtx-3090", "nvidia-rtx-4080", "nvidia-rtx-4090",
      "amd-rx-6800-xt", "amd-rx-6900-xt", "amd-rx-7800-xt", "amd-rx-7900-xtx",
      "nvidia-a100", "nvidia-h100"
    ],
    "hardware_bonuses": {
      "nvidia-rtx-4090": "5000000000000000",
      "nvidia-a100": "5000000000000000",
      "nvidia-h100": "10000000000000000",
      "xilinx-fpga": "15000000000000000",
      "amd-rx-7900-xtx": "5500000000000000"
    },
    "cysic_integration": {
      "endpoint": "https://api.cysic.xyz/v1",
      "proof_method": "zk-snark",
      "hardware_acceleration": true
    }
  }
}
EOF
    
    print_status "zChain UTXO hardware mining configured"
    cd ..
}

# Setup cross-chain relayer
setup_relayer() {
    print_header "Setting up cross-chain relayer"
    
    cd oracle
    
    # Install relayer dependencies
    print_status "Installing relayer dependencies..."
    npm install ethers ws axios
    pip3 install asyncio websockets requests
    
    # Create relayer configuration
    cat > relayer-config.json << EOF
{
  "chains": {
    "altcoinchain": {
      "rpc": "TBD",
      "chain_id": $ALTCOINCHAIN_CHAIN_ID,
      "oracle_address": "0x0000000000000000000000000000000000000000",
      "mining_game_address": "$MINING_GAME_ALTCOINCHAIN",
      "watt_token_address": "$WATT_TOKEN_ALTCOINCHAIN"
    },
    "polygon": {
      "rpc": "https://polygon-rpc.com",
      "chain_id": $POLYGON_CHAIN_ID,
      "oracle_address": "0x0000000000000000000000000000000000000000",
      "mining_game_address": "$MINING_GAME_POLYGON",
      "watt_token_address": "$WATT_TOKEN_POLYGON"
    },
    "nuchain": {
      "rpc": "http://localhost:26657",
      "websocket": "ws://localhost:26657/websocket",
      "chain_id": "$NUCHAIN_CHAIN_ID"
    },
    "zchain": {
      "rpc": "http://localhost:26658",
      "websocket": "ws://localhost:26658/websocket",
      "chain_id": "$ZCHAIN_CHAIN_ID"
    }
  },
  "cysic": {
    "endpoint": "https://api.cysic.xyz/v1",
    "api_key": "your_cysic_api_key_here",
    "hardware_id": "nvidia-a100"
  },
  "mining": {
    "target_block_time_ms": 500,
    "hardware_acceleration": true,
    "asic_resistant": true,
    "pool_endpoint": "stratum+tcp://pool.nuchain.network:3333"
  }
}
EOF
    
    # Create systemd service for relayer
    sudo tee /etc/systemd/system/zk-oracle-relayer.service > /dev/null <<EOF
[Unit]
Description=zk-rollup L2 Oracle Relayer
After=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node CrossChainRelayer.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable zk-oracle-relayer
    
    print_status "Cross-chain relayer configured"
    cd ..
}

# Setup Cysic hardware mining
setup_cysic_mining() {
    print_header "Setting up Cysic hardware mining"
    
    # Create Cysic mining configuration
    cat > oracle/cysic-mining-config.json << EOF
{
  "hardware_config": {
    "gpu_enabled": true,
    "fpga_enabled": false,
    "asic_resistant": true,
    "memory_gb": 8,
    "supported_devices": [
      "nvidia-rtx-4090",
      "nvidia-a100", 
      "nvidia-h100",
      "amd-rx-7900-xtx"
    ]
  },
  "mining_config": {
    "target_block_time_ms": 500,
    "proof_generation_timeout_ms": 30000,
    "max_concurrent_proofs": 10,
    "pool_endpoint": "stratum+tcp://pool.nuchain.network:3333",
    "worker_name": "cysic-miner-1"
  },
  "reward_config": {
    "base_nu_reward": "50000000000000000",
    "base_z_reward": "50000000000000000",
    "halving_interval": 210000000,
    "hardware_bonuses": {
      "nvidia-a100": "5000000000000000",
      "nvidia-h100": "10000000000000000",
      "xilinx-fpga": "15000000000000000"
    }
  }
}
EOF
    
    # Create mining pool startup script
    cat > oracle/start-cysic-mining.sh << EOF
#!/bin/bash

echo "⚡ Starting Cysic Hardware Mining Pool"
echo "====================================="

# Check hardware
if command -v nvidia-smi &> /dev/null; then
    echo "🔥 NVIDIA GPU detected:"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "⚠️ No NVIDIA GPU detected"
fi

# Start Cysic hardware miner
echo "🚀 Starting Cysic hardware miner..."
python3 cysic-hardware-miner.py &

# Start cross-chain relayer
echo "🔗 Starting cross-chain relayer..."
node CrossChainRelayer.js &

echo "✅ Cysic mining pool started"
echo "📊 Monitor at: http://localhost:3001/stats"
EOF
    
    chmod +x oracle/start-cysic-mining.sh
    
    print_status "Cysic hardware mining configured"
}

# Create monitoring dashboard
create_monitoring() {
    print_header "Creating monitoring dashboard"
    
    # Create monitoring configuration
    cat > oracle/monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nuchain'
    static_configs:
      - targets: ['localhost:26657']
  
  - job_name: 'zchain'
    static_configs:
      - targets: ['localhost:26658']
  
  - job_name: 'oracle-relayer'
    static_configs:
      - targets: ['localhost:3001']
  
  - job_name: 'cysic-miner'
    static_configs:
      - targets: ['localhost:3002']
EOF
    
    # Create Grafana dashboard
    cat > oracle/monitoring/grafana-dashboard.json << EOF
{
  "dashboard": {
    "title": "zk-rollup L2 Oracle Mining Dashboard",
    "panels": [
      {
        "title": "Block Production Rate",
        "type": "graph",
        "targets": [
          {"expr": "rate(nuchain_blocks_total[1m])", "legendFormat": "nuChain"},
          {"expr": "rate(zchain_blocks_total[1m])", "legendFormat": "zChain"}
        ]
      },
      {
        "title": "Cysic Proof Generation",
        "type": "graph",
        "targets": [
          {"expr": "rate(cysic_proofs_generated_total[1m])", "legendFormat": "Proofs/sec"}
        ]
      },
      {
        "title": "Hardware Mining Stats",
        "type": "table",
        "targets": [
          {"expr": "hardware_miners_active", "legendFormat": "Active Miners"},
          {"expr": "total_hash_power", "legendFormat": "Total Hash Power"},
          {"expr": "total_watt_consumption", "legendFormat": "WATT Consumption"}
        ]
      }
    ]
  }
}
EOF
    
    print_status "Monitoring dashboard configured"
}

# Print deployment summary
print_deployment_summary() {
    print_header "Oracle System Deployment Summary"
    
    echo ""
    echo -e "${GREEN}🎉 zk-rollup L2 Oracle System Ready for Deployment!${NC}"
    echo ""
    echo "Components:"
    echo "✅ CysicZkOracle contracts (Altcoinchain & Polygon)"
    echo "✅ Cross-chain relayer (Node.js)"
    echo "✅ Cysic hardware miner (Python)"
    echo "✅ UTXO sidechain bridge (Go)"
    echo "✅ nuChain oracle module (Cosmos SDK)"
    echo ""
    echo "Integration Points:"
    echo "🔗 Mining Game NFTs → Oracle Contracts → nuChain L2"
    echo "⚡ Cysic Hardware Mining → zChain UTXO → Cross-chain Rewards"
    echo "🌉 LayerZero Messaging → Altcoinchain/Polygon ↔ nuChain"
    echo ""
    echo "Next Steps:"
    echo "1. Deploy oracle contracts to Altcoinchain and Polygon"
    echo "2. Deploy nuChain L2 with oracle module"
    echo "3. Deploy zChain UTXO sidechain with hardware mining"
    echo "4. Start Cysic hardware mining pool"
    echo "5. Configure LayerZero cross-chain messaging"
    echo ""
    echo "Deployment Commands:"
    echo "📦 Oracle Contracts:"
    echo "   cd contracts && npx hardhat run scripts/deploy-oracle-altcoinchain.js --network altcoinchain"
    echo "   cd contracts && npx hardhat run scripts/deploy-oracle-polygon.js --network polygon"
    echo ""
    echo "🚀 nuChain L2:"
    echo "   cd nuchain && ignite chain serve --config config.yml"
    echo ""
    echo "⛏️ zChain UTXO:"
    echo "   cd z-blockchain && ignite chain serve --config config.yml"
    echo ""
    echo "⚡ Cysic Mining:"
    echo "   cd oracle && ./start-cysic-mining.sh"
    echo ""
    echo "📊 Monitoring:"
    echo "   Oracle Stats: http://localhost:3001/stats"
    echo "   Mining Stats: http://localhost:3002/stats"
    echo "   nuChain RPC: http://localhost:26657"
    echo "   zChain RPC: http://localhost:26658"
    echo ""
    echo -e "${BLUE}Ready for Sonic Labs validation and mainnet deployment! 🚀⛏️${NC}"
}

# Main deployment flow
main() {
    print_header "Starting oracle system deployment"
    
    check_prerequisites
    deploy_oracle_contracts
    setup_nuchain_oracle
    setup_zchain_utxo
    setup_relayer
    setup_cysic_mining
    create_monitoring
    print_deployment_summary
}

# Run main function
main "$@"