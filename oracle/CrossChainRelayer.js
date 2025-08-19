const { ethers } = require('ethers');
const WebSocket = require('ws');
const axios = require('axios');

/**
 * Cross-chain Relayer for Mining Game NFT data
 * Monitors Altcoinchain and Polygon for mining rig updates
 * Submits zk-proofs to nuChain for block rewards
 */
class CrossChainRelayer {
    constructor(config) {
        this.config = config;
        this.providers = {
            altcoinchain: new ethers.providers.JsonRpcProvider(config.altcoinchain.rpc),
            polygon: new ethers.providers.JsonRpcProvider(config.polygon.rpc)
        };
        
        // Oracle contracts
        this.oracles = {
            altcoinchain: new ethers.Contract(
                config.altcoinchain.oracleAddress,
                config.oracleABI,
                this.providers.altcoinchain
            ),
            polygon: new ethers.Contract(
                config.polygon.oracleAddress,
                config.oracleABI,
                this.providers.polygon
            )
        };
        
        // nuChain connection
        this.nuChainRPC = config.nuChain.rpc;
        this.nuChainWS = null;
        
        // Mining state
        this.miners = new Map();
        this.pendingProofs = new Map();
        this.blockHeight = 0;
        
        this.initializeRelayer();
    }

    async initializeRelayer() {
        console.log('🚀 Initializing Cross-chain Relayer...');
        
        // Connect to nuChain WebSocket
        await this.connectToNuChain();
        
        // Start monitoring chains
        this.startChainMonitoring();
        
        // Start Cysic proof generation
        this.startCysicMining();
        
        console.log('✅ Cross-chain Relayer initialized successfully');
    }

    async connectToNuChain() {
        try {
            this.nuChainWS = new WebSocket(this.config.nuChain.websocket);
            
            this.nuChainWS.on('open', () => {
                console.log('🔗 Connected to nuChain WebSocket');
                this.subscribeToBlocks();
            });
            
            this.nuChainWS.on('message', (data) => {
                this.handleNuChainMessage(JSON.parse(data));
            });
            
            this.nuChainWS.on('close', () => {
                console.log('❌ nuChain WebSocket disconnected, reconnecting...');
                setTimeout(() => this.connectToNuChain(), 5000);
            });
            
        } catch (error) {
            console.error('Failed to connect to nuChain:', error);
        }
    }

    subscribeToBlocks() {
        const subscription = {
            jsonrpc: '2.0',
            method: 'subscribe',
            params: ['tm.event = \'NewBlock\''],
            id: 1
        };
        
        this.nuChainWS.send(JSON.stringify(subscription));
    }

    handleNuChainMessage(message) {
        if (message.result && message.result.data && message.result.data.value) {
            const block = message.result.data.value.block;
            this.blockHeight = parseInt(block.header.height);
            
            console.log(`📦 nuChain Block ${this.blockHeight} - generating zk-proofs...`);
            this.generateCysicProofs();
        }
    }

    startChainMonitoring() {
        // Monitor Altcoinchain for Mining Game NFT events
        this.oracles.altcoinchain.on('MinerRegistered', (miner, rigIds, hashPower, nuChainAddress) => {
            this.handleMinerRegistration('altcoinchain', miner, rigIds, hashPower, nuChainAddress);
        });
        
        // Monitor Polygon for Mining Game NFT events
        this.oracles.polygon.on('MinerRegistered', (miner, rigIds, hashPower, nuChainAddress) => {
            this.handleMinerRegistration('polygon', miner, rigIds, hashPower, nuChainAddress);
        });
        
        console.log('👀 Monitoring Altcoinchain and Polygon for Mining Game events');
    }

    handleMinerRegistration(chain, miner, rigIds, hashPower, nuChainAddress) {
        const minerKey = `${chain}:${miner}`;
        
        this.miners.set(minerKey, {
            chain,
            address: miner,
            rigIds: rigIds.map(id => id.toString()),
            totalHashPower: hashPower.toString(),
            nuChainAddress,
            lastProof: 0,
            isActive: true
        });
        
        console.log(`⛏️ Registered miner on ${chain}: ${miner} (${ethers.utils.formatUnits(hashPower, 0)} H/s)`);
    }

    async generateCysicProofs() {
        const activeMiners = Array.from(this.miners.values()).filter(m => m.isActive);
        
        for (const miner of activeMiners) {
            try {
                await this.generateCysicProofForMiner(miner);
            } catch (error) {
                console.error(`Failed to generate proof for ${miner.address}:`, error);
            }
        }
    }

    async generateCysicProofForMiner(miner) {
        // Prepare public inputs for Cysic proof
        const publicInputs = this.prepareCysicInputs(miner);
        
        // Generate Cysic zk-SNARK proof
        const cysicProof = await this.callCysicProver(publicInputs, miner);
        
        if (cysicProof) {
            // Submit proof to oracle contract
            await this.submitProofToOracle(miner, cysicProof, publicInputs);
            
            // Relay to nuChain
            await this.relayToNuChain(miner, cysicProof);
        }
    }

    prepareCysicInputs(miner) {
        return {
            minerAddress: miner.address,
            rigIds: miner.rigIds,
            totalHashPower: miner.totalHashPower,
            blockHeight: this.blockHeight,
            timestamp: Math.floor(Date.now() / 1000),
            chainId: miner.chain === 'altcoinchain' ? 2330 : 137
        };
    }

    async callCysicProver(publicInputs, miner) {
        try {
            // Call Cysic hardware acceleration API
            const response = await axios.post(this.config.cysic.endpoint, {
                method: 'generate_mining_proof',
                params: {
                    public_inputs: publicInputs,
                    hardware_id: this.config.cysic.hardwareId,
                    miner_address: miner.address,
                    rig_configuration: {
                        hash_power: miner.totalHashPower,
                        watt_consumption: miner.totalWattConsumption
                    }
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.config.cysic.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                console.log(`🔐 Generated Cysic proof for ${miner.address}`);
                return response.data.proof;
            }
            
        } catch (error) {
            console.error('Cysic proof generation failed:', error.message);
        }
        
        return null;
    }

    async submitProofToOracle(miner, cysicProof, publicInputs) {
        try {
            const chain = miner.chain;
            const provider = this.providers[chain];
            const wallet = new ethers.Wallet(this.config.privateKey, provider);
            const oracle = this.oracles[chain].connect(wallet);
            
            // Submit proof to oracle
            const tx = await oracle.submitCysicProof(
                cysicProof.proof_bytes,
                ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify(publicInputs))),
                this.blockHeight
            );
            
            await tx.wait();
            console.log(`📡 Submitted proof to ${chain} oracle: ${tx.hash}`);
            
        } catch (error) {
            console.error('Failed to submit proof to oracle:', error);
        }
    }

    async relayToNuChain(miner, cysicProof) {
        try {
            // Create nuChain transaction payload
            const payload = {
                type: 'mining_reward_claim',
                miner_address: miner.address,
                nuchain_address: miner.nuChainAddress,
                hash_power: miner.totalHashPower,
                watt_consumption: miner.totalWattConsumption,
                block_height: this.blockHeight,
                cysic_proof: cysicProof.proof_bytes,
                source_chain: miner.chain
            };
            
            // Submit to nuChain via RPC
            const response = await axios.post(this.nuChainRPC, {
                jsonrpc: '2.0',
                method: 'broadcast_tx_commit',
                params: {
                    tx: this.createNuChainTx(payload)
                },
                id: Date.now()
            });
            
            if (response.data.result.code === 0) {
                console.log(`🎯 Relayed to nuChain: ${response.data.result.hash}`);
            }
            
        } catch (error) {
            console.error('Failed to relay to nuChain:', error);
        }
    }

    createNuChainTx(payload) {
        // Create Cosmos SDK transaction for nuChain
        const msg = {
            type: 'mining/ProcessCrossChainMessage',
            value: {
                creator: this.config.relayerAddress,
                source_chain: payload.source_chain,
                message_type: 'mining_reward_claim',
                payload: Buffer.from(JSON.stringify(payload)).toString('base64'),
                nonce: Date.now()
            }
        };
        
        // Sign and encode transaction (simplified)
        return Buffer.from(JSON.stringify(msg)).toString('base64');
    }

    startCysicMining() {
        // Start continuous Cysic proof generation
        setInterval(() => {
            if (this.miners.size > 0) {
                console.log(`⚡ Generating Cysic proofs for ${this.miners.size} miners...`);
                this.generateCysicProofs();
            }
        }, 500); // Every 0.5 seconds (target block time)
    }

    // Utility methods
    async getNetworkStats() {
        const stats = {
            totalMiners: this.miners.size,
            totalHashPower: 0,
            totalWattConsumption: 0,
            activeChains: ['altcoinchain-2330', 'polygon-137'],
            blockHeight: this.blockHeight
        };
        
        for (const miner of this.miners.values()) {
            stats.totalHashPower += parseInt(miner.totalHashPower);
            // Calculate WATT consumption based on rig configuration
        }
        
        return stats;
    }

    async healthCheck() {
        const health = {
            nuChainConnected: this.nuChainWS && this.nuChainWS.readyState === WebSocket.OPEN,
            altcoinchainConnected: await this.checkProviderHealth('altcoinchain'),
            polygonConnected: await this.checkProviderHealth('polygon'),
            cysicAvailable: await this.checkCysicHealth(),
            activeMiners: this.miners.size,
            lastBlockHeight: this.blockHeight
        };
        
        return health;
    }

    async checkProviderHealth(chain) {
        try {
            const blockNumber = await this.providers[chain].getBlockNumber();
            return blockNumber > 0;
        } catch {
            return false;
        }
    }

    async checkCysicHealth() {
        try {
            const response = await axios.get(`${this.config.cysic.endpoint}/health`);
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

// Configuration
const relayerConfig = {
    altcoinchain: {
        rpc: process.env.ALTCOINCHAIN_RPC || 'TBD',
        oracleAddress: '0x0000000000000000000000000000000000000000', // Deploy oracle first
        chainId: 2330
    },
    polygon: {
        rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
        oracleAddress: '0x0000000000000000000000000000000000000000', // Deploy oracle first
        chainId: 137
    },
    nuChain: {
        rpc: 'http://localhost:26657',
        websocket: 'ws://localhost:26657/websocket',
        chainId: 'nuchain-1'
    },
    cysic: {
        endpoint: 'https://api.cysic.xyz/v1',
        apiKey: process.env.CYSIC_API_KEY,
        hardwareId: process.env.HARDWARE_ID || 'nvidia-a100'
    },
    privateKey: process.env.PRIVATE_KEY,
    relayerAddress: process.env.RELAYER_ADDRESS,
    oracleABI: [] // Add oracle contract ABI
};

// Start relayer
if (require.main === module) {
    const relayer = new CrossChainRelayer(relayerConfig);
    
    // Health check endpoint
    const express = require('express');
    const app = express();
    
    app.get('/health', async (req, res) => {
        const health = await relayer.healthCheck();
        res.json(health);
    });
    
    app.get('/stats', async (req, res) => {
        const stats = await relayer.getNetworkStats();
        res.json(stats);
    });
    
    app.listen(3001, () => {
        console.log('🌐 Relayer API listening on port 3001');
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log('⚠️ Port 3001 in use, trying port 3003...');
            app.listen(3003, () => {
                console.log('🌐 Relayer API listening on port 3003');
            }).on('error', (err) => {
                console.error('❌ Failed to start API server:', err.message);
                process.exit(1);
            });
        } else {
            console.error('❌ Server error:', err.message);
            process.exit(1);
        }
    });
}

module.exports = CrossChainRelayer;