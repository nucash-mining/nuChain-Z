# Z Blockchain & nuChain Makefile
# Provides common development and deployment tasks

.PHONY: help install build test clean start stop deploy health lint format

# Default target
help: ## Show this help message
	@echo "Z Blockchain & nuChain Development Commands"
	@echo "============================================"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }\' $(MAKEFILE_LIST)

# Installation and setup
install: ## Install all dependencies and setup development environment
	@echo "🚀 Setting up development environment..."
	./scripts/setup.sh

# Build targets
build: build-chains build-wallet ## Build all components

build-chains: ## Build blockchain binaries
	@echo "🔨 Building Z Blockchain..."
	cd z-blockchain && ignite chain build --release
	@echo "🔨 Building nuChain..."
	cd nuchain && ignite chain build --release

build-wallet: ## Build wallet application
	@echo "🔨 Building wallet backend..."
	cd z-core-wallet && go build -o bin/wallet main.go
	@echo "🔨 Building wallet frontend..."
	cd z-core-wallet/electron && npm run build

build-contracts: ## Compile smart contracts
	@echo "🔨 Compiling smart contracts..."
	cd contracts && npm install && npx hardhat compile

# Testing
test: test-chains test-wallet test-contracts ## Run all tests

test-chains: ## Run blockchain tests
	@echo "🧪 Testing Z Blockchain..."
	cd z-blockchain && go test ./...
	@echo "🧪 Testing nuChain..."
	cd nuchain && go test ./...

test-wallet: ## Run wallet tests
	@echo "🧪 Testing wallet..."
	cd z-core-wallet && go test ./...

test-contracts: ## Run smart contract tests
	@echo "🧪 Testing smart contracts..."
	cd contracts && npx hardhat test

# Development servers
start: ## Start all development services
	@echo "🚀 Starting development environment..."
	$(MAKE) start-chains &
	sleep 10
	$(MAKE) start-wallet &
	@echo "✅ All services started"

start-chains: ## Start blockchain nodes
	@echo "🔗 Starting Z Blockchain..."
	cd z-blockchain && ignite chain serve --config config.yml &
	@echo "🔗 Starting nuChain..."
	cd nuchain && ignite chain serve --config config.yml &

start-wallet: ## Start wallet services
	@echo "💰 Starting wallet backend..."
	cd z-core-wallet && go run main.go &
	@echo "💰 Starting wallet GUI..."
	cd z-core-wallet/electron && npm start &

stop: ## Stop all running services
	@echo "🛑 Stopping all services..."
	pkill -f "ignite" || true
	pkill -f "z-blockchaind" || true
	pkill -f "nuchaind" || true
	pkill -f "wallet" || true
	pkill -f "electron" || true
	@echo "✅ All services stopped"

# Deployment
deploy-testnet: ## Deploy to testnet
	@echo "🚀 Deploying to testnet..."
	./scripts/deploy.sh testnet

deploy-mainnet: ## Deploy to mainnet (with confirmation)
	@echo "⚠️  WARNING: This will deploy to MAINNET!"
	@read -p "Are you sure? (y/N): \" confirm && [ "$$confirm" = "y" ]
	./scripts/deploy.sh mainnet

# Health and monitoring
health: ## Check system health
	@echo "🏥 Performing health check..."
	./scripts/health-check.sh

logs: ## Show recent logs
	@echo "📋 Recent logs..."
	tail -n 50 logs/*.log

status: ## Show system status
	@echo "📊 System Status"
	@echo "================"
	@echo "Z Blockchain:"
	@curl -s http://localhost:26657/status | jq '.result.sync_info' || echo "  Not running"
	@echo "nuChain:"
	@curl -s http://localhost:26658/status | jq '.result.sync_info' || echo "  Not running"
	@echo "Wallet:"
	@curl -s http://localhost:8080/api/wallet > /dev/null && echo "  Running" || echo "  Not running"

# Code quality
lint: ## Run linters on all code
	@echo "🔍 Running linters..."
	cd z-blockchain && golangci-lint run
	cd nuchain && golangci-lint run
	cd z-core-wallet && golangci-lint run
	cd contracts && npx eslint . --ext .js,.ts,.sol

format: ## Format all code
	@echo "🎨 Formatting code..."
	cd z-blockchain && go fmt ./...
	cd nuchain && go fmt ./...
	cd z-core-wallet && go fmt ./...
	cd contracts && npx prettier --write .

# Utilities
clean: ## Clean build artifacts and temporary files
	@echo "🧹 Cleaning build artifacts..."
	rm -rf z-blockchain/build/
	rm -rf nuchain/build/
	rm -rf z-core-wallet/bin/
	rm -rf z-core-wallet/electron/dist/
	rm -rf contracts/artifacts/
	rm -rf contracts/cache/
	rm -rf logs/*.log
	@echo "✅ Clean complete"

reset: ## Reset all chains and data (destructive)
	@echo "⚠️  WARNING: This will delete all blockchain data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ]
	$(MAKE) stop
	$(MAKE) clean
	rm -rf data/
	rm -rf ~/.z-blockchain*
	rm -rf ~/.nuchain*
	@echo "✅ Reset complete"

backup: ## Create backup of important data
	@echo "💾 Creating backup..."
	mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	cp -r data/ backups/$(shell date +%Y%m%d_%H%M%S)/data/
	cp -r logs/ backups/$(shell date +%Y%m%d_%H%M%S)/logs/
	@echo "✅ Backup created"

# Mining
start-mining: ## Start mining on testnet
	@echo "⛏️  Starting mining..."
	cd z-core-wallet && go run mining/miner.go --pool stratum+tcp://pool-testnet.z-blockchain.com:3333

# Documentation
docs: ## Generate documentation
	@echo "📚 Generating documentation..."
	cd docs && ./generate.sh

docs-serve: ## Serve documentation locally
	@echo "📚 Serving documentation at http://localhost:3001"
	cd docs && python3 -m http.server 3001

# Docker support
docker-build: ## Build Docker images
	@echo "🐳 Building Docker images..."
	docker build -t z-blockchain:latest -f Dockerfile.z-blockchain .
	docker build -t nuchain:latest -f Dockerfile.nuchain .
	docker build -t z-wallet:latest -f Dockerfile.wallet .

docker-up: ## Start services with Docker Compose
	@echo "🐳 Starting services with Docker..."
	docker-compose up -d

docker-down: ## Stop Docker services
	@echo "🐳 Stopping Docker services..."
	docker-compose down

# Version and release
version: ## Show version information
	@echo "📋 Version Information"
	@echo "====================="
	@echo "Z Blockchain: $(shell cd z-blockchain && ignite version 2>/dev/null | head -1 || echo 'Unknown')"
	@echo "nuChain: $(shell cd nuchain && ignite version 2>/dev/null | head -1 || echo 'Unknown')"
	@echo "Go: $(shell go version | grep -o 'go[0-9.]*')"
	@echo "Node.js: $(shell node --version)"
	@echo "Docker: $(shell docker --version | grep -o 'Docker version [0-9.]*')"

release: ## Create a new release
	@echo "🎉 Creating release..."
	./scripts/release.sh

# Development helpers
dev-reset: ## Quick reset for development
	$(MAKE) stop
	rm -rf data/
	$(MAKE) start

dev-logs: ## Follow development logs
	tail -f logs/z-blockchain-*.log logs/nuchain-*.log logs/wallet.log

# Performance testing
benchmark: ## Run performance benchmarks
	@echo "🏃 Running benchmarks..."
	cd z-blockchain && go test -bench=. ./...
	cd nuchain && go test -bench=. ./...

load-test: ## Run load tests
	@echo "📈 Running load tests..."
	./scripts/load-test.sh

# Security
security-scan: ## Run security scans
	@echo "🔒 Running security scans..."
	cd contracts && npx slither . || true
	cd contracts && npx mythril . || true
	gosec -fmt json -out security-report.json -stdout ./... || true

# Database operations
db-migrate: ## Run database migrations
	@echo "💾 Running database migrations..."
	# Add Supabase migration commands here when integrated

db-backup: ## Backup database
	@echo "💾 Backing up database..."
	# Add database backup commands here

# Monitoring
monitor-start: ## Start monitoring services
	@echo "📊 Starting monitoring..."
	docker-compose -f docker-compose.monitoring.yml up -d

monitor-stop: ## Stop monitoring services
	@echo "📊 Stopping monitoring..."
	docker-compose -f docker-compose.monitoring.yml down

# CI/CD helpers
ci-setup: ## Setup for CI/CD environment
	@echo "🤖 Setting up CI/CD..."
	$(MAKE) install
	$(MAKE) build
	$(MAKE) test

ci-deploy: ## Deploy from CI/CD
	@echo "🤖 CI/CD deployment..."
	./scripts/ci-deploy.sh

# Quick development commands
quick-start: install build start ## Quick setup and start (install + build + start)

quick-test: build test ## Quick test (build + test)

quick-deploy: build test deploy-testnet ## Quick deploy to testnet (build + test + deploy)