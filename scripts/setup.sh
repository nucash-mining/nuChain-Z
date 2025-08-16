#!/bin/bash

# Z Blockchain & nuChain Development Environment Setup
# This script sets up the development environment for both chains

set -e

echo "🚀 Setting up Z Blockchain & nuChain Development Environment"
echo "============================================================"

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

# Check if running on supported OS
check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    print_status "Detected OS: $OS"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install dependencies
install_dependencies() {
    print_header "Installing System Dependencies"
    
    if [[ "$OS" == "linux" ]]; then
        # Update package manager
        if command_exists apt-get; then
            print_status "Updating package manager..."
            sudo apt-get update -qq
            
            print_status "Installing build essentials..."
            sudo apt-get install -y build-essential curl wget git
            
        elif command_exists yum; then
            print_status "Updating package manager..."
            sudo yum update -y
            
            print_status "Installing development tools..."
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y curl wget git
            
        else
            print_error "Unsupported Linux distribution"
            exit 1
        fi
        
    elif [[ "$OS" == "macos" ]]; then
        # Check if Homebrew is installed
        if ! command_exists brew; then
            print_status "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        print_status "Installing dependencies via Homebrew..."
        brew install curl wget git
    fi
}

# Install Go
install_go() {
    print_header "Installing Go"
    
    if command_exists go; then
        GO_VERSION=$(go version | grep -oP 'go\K[0-9]+\.[0-9]+')
        if [[ "$GO_VERSION" < "1.21" ]]; then
            print_warning "Go version $GO_VERSION found, but 1.21+ is required. Installing latest..."
        else
            print_status "Go $GO_VERSION is already installed"
            return
        fi
    fi
    
    # Download and install Go
    GO_VERSION="1.21.5"
    if [[ "$OS" == "linux" ]]; then
        GO_TARBALL="go${GO_VERSION}.linux-amd64.tar.gz"
    elif [[ "$OS" == "macos" ]]; then
        GO_TARBALL="go${GO_VERSION}.darwin-amd64.tar.gz"
    fi
    
    print_status "Downloading Go $GO_VERSION..."
    wget -q "https://go.dev/dl/${GO_TARBALL}"
    
    print_status "Installing Go..."
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf "$GO_TARBALL"
    rm "$GO_TARBALL"
    
    # Add Go to PATH
    if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        echo 'export GOPATH=$HOME/go' >> ~/.bashrc
        echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc
    fi
    
    export PATH=$PATH:/usr/local/go/bin
    export GOPATH=$HOME/go
    export PATH=$PATH:$GOPATH/bin
    
    print_status "Go installed successfully"
    go version
}

# Install Node.js
install_nodejs() {
    print_header "Installing Node.js"
    
    if command_exists node; then
        NODE_VERSION=$(node --version | grep -oP 'v\K[0-9]+')
        if [[ "$NODE_VERSION" -ge "18" ]]; then
            print_status "Node.js $(node --version) is already installed"
            return
        else
            print_warning "Node.js version $NODE_VERSION found, but 18+ is required. Installing latest..."
        fi
    fi
    
    # Install Node.js via NodeSource
    if [[ "$OS" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "macos" ]]; then
        brew install node
    fi
    
    print_status "Node.js installed successfully"
    node --version
    npm --version
}

# Install Docker
install_docker() {
    print_header "Installing Docker"
    
    if command_exists docker; then
        print_status "Docker is already installed"
        docker --version
        return
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Install Docker on Linux
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
        
        # Add current user to docker group
        sudo usermod -aG docker $USER
        
        # Start Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
    elif [[ "$OS" == "macos" ]]; then
        print_status "Please install Docker Desktop for Mac from:"
        print_status "https://www.docker.com/products/docker-desktop"
        print_warning "Manual installation required for macOS"
    fi
}

# Install Ignite CLI
install_ignite() {
    print_header "Installing Ignite CLI"
    
    if command_exists ignite; then
        print_status "Ignite CLI is already installed"
        ignite version
        return
    fi
    
    print_status "Installing Ignite CLI..."
    go install github.com/ignite/cli/v0.27.1@latest
    
    print_status "Ignite CLI installed successfully"
    ignite version
}

# Setup Go workspace
setup_go_workspace() {
    print_header "Setting up Go workspace"
    
    # Create Go workspace directory
    mkdir -p "$HOME/go/src" "$HOME/go/bin" "$HOME/go/pkg"
    
    # Initialize Go workspace
    cd "$(dirname "$0")/.."
    if [[ ! -f "go.work" ]]; then
        go work init
        go work use ./z-blockchain
        go work use ./nuchain
        go work use ./z-core-wallet
    fi
    
    print_status "Go workspace configured"
}

# Install project dependencies
install_project_deps() {
    print_header "Installing project dependencies"
    
    cd "$(dirname "$0")/.."
    
    # Install Go dependencies
    print_status "Installing Go dependencies..."
    go mod tidy
    
    # Install wallet dependencies
    if [[ -d "z-core-wallet/electron" ]]; then
        print_status "Installing wallet dependencies..."
        cd z-core-wallet/electron
        npm install
        cd ../..
    fi
    
    print_status "Project dependencies installed"
}

# Create configuration files
create_configs() {
    print_header "Creating configuration files"
    
    cd "$(dirname "$0")/.."
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        cat > .env << EOF
# Z Blockchain Configuration
Z_BLOCKCHAIN_RPC=http://localhost:26657
Z_BLOCKCHAIN_REST=http://localhost:1317
Z_BLOCKCHAIN_CHAIN_ID=z-blockchain-1

# nuChain Configuration
NUCHAIN_RPC=http://localhost:26658
NUCHAIN_REST=http://localhost:1318
NUCHAIN_CHAIN_ID=nuchain-1

# Wallet Configuration
WALLET_PORT=8080
WALLET_HOST=localhost

# LayerZero Configuration (Update with actual endpoints)
LAYERZERO_ENDPOINT_ETH=0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675
LAYERZERO_ENDPOINT_POLYGON=0x3c2269811836af69497E5F486A85D7316753cf62

# Mining Configuration
MINING_POOL_HOST=pool.z-blockchain.com
MINING_POOL_PORT=3333
MINING_WORKER_NAME=worker1

# Development flags
NODE_ENV=development
DEBUG=true
EOF
        print_status "Created .env file"
    fi
    
    # Create directories
    mkdir -p logs
    mkdir -p data/z-blockchain
    mkdir -p data/nuchain
    
    print_status "Configuration files created"
}

# Verify installation
verify_installation() {
    print_header "Verifying installation"
    
    local errors=0
    
    # Check Go
    if command_exists go; then
        print_status "✓ Go: $(go version | grep -o 'go[0-9.]*')"
    else
        print_error "✗ Go is not installed or not in PATH"
        ((errors++))
    fi
    
    # Check Node.js
    if command_exists node; then
        print_status "✓ Node.js: $(node --version)"
    else
        print_error "✗ Node.js is not installed"
        ((errors++))
    fi
    
    # Check Docker
    if command_exists docker; then
        print_status "✓ Docker: $(docker --version | grep -o 'Docker version [0-9.]*')"
    else
        print_error "✗ Docker is not installed"
        ((errors++))
    fi
    
    # Check Ignite
    if command_exists ignite; then
        print_status "✓ Ignite CLI: $(ignite version 2>/dev/null | head -1 || echo 'installed')"
    else
        print_error "✗ Ignite CLI is not installed"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        print_status "🎉 All dependencies installed successfully!"
        return 0
    else
        print_error "❌ $errors error(s) found during verification"
        return 1
    fi
}

# Print next steps
print_next_steps() {
    print_header "Next Steps"
    
    echo ""
    echo -e "${GREEN}Setup completed successfully!${NC}"
    echo ""
    echo "To get started:"
    echo "1. Restart your terminal or run: source ~/.bashrc"
    echo "2. Initialize the chains:"
    echo "   cd z-blockchain && ignite chain serve"
    echo "   cd nuchain && ignite chain serve  # (in another terminal)"
    echo ""
    echo "3. Start the wallet:"
    echo "   cd z-core-wallet && go run main.go"
    echo ""
    echo "4. Open the Electron wallet app:"
    echo "   cd z-core-wallet/electron && npm start"
    echo ""
    echo "5. Deploy smart contracts:"
    echo "   ./scripts/deploy.sh testnet"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "- Z Blockchain: ./docs/z-blockchain.md"
    echo "- nuChain: ./docs/nuchain.md"
    echo "- Wallet: ./docs/wallet.md"
    echo "- Mining: ./docs/mining.md"
    echo ""
    echo -e "${YELLOW}For support, visit: https://github.com/z-blockchain/support${NC}"
}

# Main installation flow
main() {
    echo "Starting installation process..."
    
    check_os
    install_dependencies
    install_go
    install_nodejs
    install_docker
    install_ignite
    setup_go_workspace
    install_project_deps
    create_configs
    
    echo ""
    if verify_installation; then
        print_next_steps
        exit 0
    else
        print_error "Installation completed with errors. Please check the output above."
        exit 1
    fi
}

# Handle script interruption
trap 'print_error "Installation interrupted by user"; exit 1' INT

# Run main function
main "$@"