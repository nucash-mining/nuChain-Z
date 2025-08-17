import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Upload, Cpu, HardDrive, MemoryStick, Zap, Settings, Power, Plus, Trash2, Monitor, Award } from 'lucide-react';

// Contract ABIs (simplified - you'll need the full ABIs)
const NFT_MINING_RIG_ABI = [
  "function createMiningRig(address[] calldata componentContracts, uint256[] calldata componentTokenIds, uint256 genesisBadgeId) external returns (uint256)",
  "function getMiningRig(uint256 rigId) external view returns (address owner, uint256 totalHashPower, uint256 totalWattConsumption, uint256 genesisBadgeMultiplier, bool isPoweredOn, uint256 componentCount)",
  "function getUserRigs(address owner) external view returns (uint256[] memory)",
  "function toggleRigPower(uint256 rigId, bool powerOn) external"
];

const MINING_POOL_ABI = [
  "function createMiningPool(string calldata poolName, string calldata poolUrl, uint256 feePercentage, uint256 minPayoutThreshold, uint256 payoutInterval) external returns (uint256)",
  "function joinPool(uint256 poolId, uint256[] calldata rigIds) external",
  "function stakeWatt(uint256[] calldata rigIds, uint256 wattAmount) external"
];

const WATT_TOKEN_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

interface Component {
  id: string;
  name: string;
  type: 'PC Case' | 'Processor' | 'Graphics Card' | 'Boost Item';
  contract: string;
  contractAddress: string;
  tokenId: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  hashRateBonus: string;
  powerConsumption: string;
  hashPower: number;
  wattConsumption: number;
  slots?: number;
  cores?: number;
  vram?: string;
  special?: string;
  glbFile?: string;
  image?: string;
}

interface MiningRig {
  id: number;
  name: string;
  components: Component[];
  totalHashPower: number;
  totalWattConsumption: number;
  genesisBadgeMultiplier: number;
  isPoweredOn: boolean;
  efficiency: string;
  status: 'mining' | 'idle' | 'offline';
  pool?: string;
  earnings: string;
}

const MiningRigBuilder: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [nftMiningRigContract, setNftMiningRigContract] = useState<ethers.Contract | null>(null);
  const [miningPoolContract, setMiningPoolContract] = useState<ethers.Contract | null>(null);
  const [wattTokenContract, setWattTokenContract] = useState<ethers.Contract | null>(null);
  const [chainId, setChainId] = useState<number>(0);
  
  // State
  const [selectedComponents, setSelectedComponents] = useState<Component[]>([]);
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [userRigs, setUserRigs] = useState<MiningRig[]>([]);
  const [genesisBadgeId, setGenesisBadgeId] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [wattBalance, setWattBalance] = useState<string>('0');
  
  // Pool creation state
  const [showPoolCreation, setShowPoolCreation] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [poolUrl, setPoolUrl] = useState('');
  const [poolFee, setPoolFee] = useState(2.5);

  // NFT Contract addresses from WATTxchange repository
  const getContractAddresses = (chainId: number) => {
    if (chainId === 137) { // Polygon
      return {
        nftContract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', // Base contract address
        wattToken: '0x...', // Update with actual WATT token address on Polygon
        miningRigContract: '0x...', // Will be deployed
        miningPoolContract: '0x...', // Will be deployed
        components: {
          pcCase: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 1 },
          xl1Processor: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 3 },
          tx120Gpu: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 4 },
          gp50Gpu: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 5 },
          genesisBadge: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 2 }
        }
      };
    } else if (chainId === 2330) { // Altcoinchain
      return {
        nftContract: '0x...', // Update with Altcoinchain addresses
        wattToken: '0x...', // Update with actual WATT token address on Altcoinchain
        miningRigContract: '0x...', // Will be deployed
        miningPoolContract: '0x...', // Will be deployed
        components: {
          // Altcoinchain component addresses (update when available)
          pcCase: { contract: '0x...', tokenId: 1 },
          xl1Processor: { contract: '0x...', tokenId: 3 },
          tx120Gpu: { contract: '0x...', tokenId: 4 },
          gp50Gpu: { contract: '0x...', tokenId: 5 },
          genesisBadge: { contract: '0x...', tokenId: 2 }
        }
      };
    }
    return null;
  };

  useEffect(() => {
    initializeWeb3();
  }, []);

  useEffect(() => {
    if (account && chainId) {
      loadUserData();
      loadAvailableComponents();
    }
  }, [account, chainId]);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const network = await provider.getNetwork();
        
        setProvider(provider);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        
        const addresses = getContractAddresses(network.chainId);
        if (!addresses) {
          alert(`Unsupported network. Please switch to Polygon (137) or Altcoinchain (2330)`);
          return;
        }
        
        const signer = provider.getSigner();
        
        // Initialize contracts
        const nftContract = new ethers.Contract(addresses.miningRigContract, NFT_MINING_RIG_ABI, signer);
        const poolContract = new ethers.Contract(addresses.miningPoolContract, MINING_POOL_ABI, signer);
        const wattContract = new ethers.Contract(addresses.wattToken, WATT_TOKEN_ABI, signer);
        
        setNftMiningRigContract(nftContract);
        setMiningPoolContract(poolContract);
        setWattTokenContract(wattContract);
        
        // Load WATT balance
        const balance = await wattContract.balanceOf(accounts[0]);
        setWattBalance(ethers.utils.formatEther(balance));
        
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
      }
    }
  };

  const loadAvailableComponents = () => {
    const addresses = getContractAddresses(chainId);
    if (!addresses) return;

    // Real component data from WATTxchange repository
    const components: Component[] = [
      {
        id: 'pc-case-1',
        name: 'Free Mint PC Case',
        type: 'PC Case',
        contract: addresses.components.pcCase.contract + '/' + addresses.components.pcCase.tokenId,
        contractAddress: addresses.components.pcCase.contract,
        tokenId: addresses.components.pcCase.tokenId,
        rarity: 'Common',
        hashRateBonus: '0%',
        powerConsumption: '0W',
        hashPower: 0,
        wattConsumption: 0,
        slots: 4,
        glbFile: '/models/pc-case.glb',
        image: '/images/pc-case.jpg'
      },
      {
        id: 'xl1-proc-1',
        name: 'XL1 Processor',
        type: 'Processor',
        contract: addresses.components.xl1Processor.contract + '/' + addresses.components.xl1Processor.tokenId,
        contractAddress: addresses.components.xl1Processor.contract,
        tokenId: addresses.components.xl1Processor.tokenId,
        rarity: 'Rare',
        hashRateBonus: '+25%',
        powerConsumption: '125W',
        hashPower: 500000, // Base hash power
        wattConsumption: 125,
        cores: 8,
        glbFile: '/models/xl1-processor.glb',
        image: '/images/xl1-processor.jpg'
      },
      {
        id: 'tx120-gpu-1',
        name: 'TX120 GPU',
        type: 'Graphics Card',
        contract: addresses.components.tx120Gpu.contract + '/' + addresses.components.tx120Gpu.tokenId,
        contractAddress: addresses.components.tx120Gpu.contract,
        tokenId: addresses.components.tx120Gpu.tokenId,
        rarity: 'Epic',
        hashRateBonus: '+150%',
        powerConsumption: '320W',
        hashPower: 1500000, // High-end GPU hash power
        wattConsumption: 320,
        vram: '12GB',
        glbFile: '/models/tx120-gpu.glb',
        image: '/images/tx120-gpu.jpg'
      },
      {
        id: 'gp50-gpu-1',
        name: 'GP50 GPU',
        type: 'Graphics Card',
        contract: addresses.components.gp50Gpu.contract + '/' + addresses.components.gp50Gpu.tokenId,
        contractAddress: addresses.components.gp50Gpu.contract,
        tokenId: addresses.components.gp50Gpu.tokenId,
        rarity: 'Legendary',
        hashRateBonus: '+200%',
        powerConsumption: '450W',
        hashPower: 2000000, // Top-tier GPU hash power
        wattConsumption: 450,
        vram: '24GB',
        glbFile: '/models/gp50-gpu.glb',
        image: '/images/gp50-gpu.jpg'
      },
      {
        id: 'genesis-badge-1',
        name: 'Genesis Badge',
        type: 'Boost Item',
        contract: addresses.components.genesisBadge.contract + '/' + addresses.components.genesisBadge.tokenId,
        contractAddress: addresses.components.genesisBadge.contract,
        tokenId: addresses.components.genesisBadge.tokenId,
        rarity: 'Mythic',
        hashRateBonus: '+50% Overclock',
        powerConsumption: '+25%',
        hashPower: 0, // Multiplier, not direct hash power
        wattConsumption: 0,
        special: 'Overclocks all components',
        glbFile: '/models/genesis-badge.glb',
        image: '/images/genesis-badge.jpg'
      }
    ];
    
    setAvailableComponents(components);
  };

  const loadUserData = async () => {
    if (!nftMiningRigContract || !account) return;
    
    try {
      setIsLoading(true);
      
      // Load user's mining rigs
      const rigIds = await nftMiningRigContract.getUserRigs(account);
      const rigs: MiningRig[] = [];
      
      for (const rigId of rigIds) {
        const rigData = await nftMiningRigContract.getMiningRig(rigId);
        
        // Calculate efficiency
        const efficiency = rigData.totalWattConsumption > 0 
          ? (rigData.totalHashPower / rigData.totalWattConsumption).toFixed(2)
          : '0';
        
        rigs.push({
          id: rigId.toNumber(),
          name: `Mining Rig #${rigId.toNumber()}`,
          components: [], // Would load component details from contract
          totalHashPower: rigData.totalHashPower.toNumber(),
          totalWattConsumption: rigData.totalWattConsumption.toNumber(),
          genesisBadgeMultiplier: rigData.genesisBadgeMultiplier.toNumber(),
          isPoweredOn: rigData.isPoweredOn,
          efficiency: `${efficiency} MH/W`,
          status: rigData.isPoweredOn ? 'mining' : 'idle',
          earnings: rigData.isPoweredOn ? '2.47 WATT/day' : '0 WATT/day'
        });
      }
      
      setUserRigs(rigs);
      
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addComponent = (component: Component) => {
    if (selectedComponents.length >= 8) {
      alert('Maximum 8 components allowed per rig');
      return;
    }
    
    // Check component requirements
    if (component.type === 'PC Case') {
      const existingCase = selectedComponents.find(c => c.type === 'PC Case');
      if (existingCase) {
        alert('Only one PC Case allowed per rig');
        return;
      }
    }
    
    if (component.type === 'Processor') {
      const existingProcessor = selectedComponents.find(c => c.type === 'Processor');
      if (existingProcessor) {
        alert('Only one Processor allowed per rig');
        return;
      }
    }
    
    if (component.type === 'Boost Item') {
      const existingBoost = selectedComponents.find(c => c.type === 'Boost Item');
      if (existingBoost) {
        alert('Only one Boost Item allowed per rig');
        return;
      }
    }
    
    setSelectedComponents([...selectedComponents, component]);
  };

  const removeComponent = (componentId: string) => {
    setSelectedComponents(selectedComponents.filter(c => c.id !== componentId));
  };

  const calculateTotalStats = () => {
    let totalHashPower = 0;
    let totalWattConsumption = 0;
    let hasGenesisBadge = false;
    let genesisBadgeMultiplier = 100;
    
    selectedComponents.forEach(component => {
      if (component.type === 'Boost Item' && component.name === 'Genesis Badge') {
        hasGenesisBadge = true;
        genesisBadgeMultiplier = getGenesisBadgeMultiplier(genesisBadgeId || 1);
      } else {
        totalHashPower += component.hashPower;
        totalWattConsumption += component.wattConsumption;
      }
    });
    
    // Apply Genesis Badge multiplier
    if (hasGenesisBadge) {
      totalHashPower = Math.floor((totalHashPower * genesisBadgeMultiplier) / 100);
      totalWattConsumption = Math.floor((totalWattConsumption * 125) / 100); // +25% power consumption
    }
    
    const efficiency = totalWattConsumption > 0 ? (totalHashPower / totalWattConsumption).toFixed(2) : '0';
    
    return { 
      totalHashPower, 
      totalWattConsumption, 
      efficiency: `${efficiency} MH/W`,
      genesisBadgeMultiplier 
    };
  };

  const getGenesisBadgeMultiplier = (badgeId: number): number => {
    if (badgeId <= 100) return 200; // 200% for ultra rare
    if (badgeId <= 500) return 150; // 150% for rare
    if (badgeId <= 2000) return 125; // 125% for uncommon
    return 110; // 110% for common
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Mythic': return 'from-purple-500 to-pink-500';
      case 'Legendary': return 'from-yellow-500 to-orange-500';
      case 'Epic': return 'from-blue-500 to-purple-500';
      case 'Rare': return 'from-green-500 to-blue-500';
      case 'Common': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const createMiningRig = async () => {
    if (!nftMiningRigContract || selectedComponents.length === 0) return;
    
    // Validate required components
    const hasCase = selectedComponents.some(c => c.type === 'PC Case');
    const hasProcessor = selectedComponents.some(c => c.type === 'Processor');
    
    if (!hasCase || !hasProcessor) {
      alert('Mining rig requires at least a PC Case and Processor');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const componentContracts = selectedComponents.map(c => c.contractAddress);
      const componentTokenIds = selectedComponents.map(c => c.tokenId);
      
      const tx = await nftMiningRigContract.createMiningRig(
        componentContracts,
        componentTokenIds,
        genesisBadgeId
      );
      
      await tx.wait();
      
      // Refresh user data
      await loadUserData();
      
      // Reset form
      setSelectedComponents([]);
      setGenesisBadgeId(0);
      
      alert('Mining rig created successfully!');
      
    } catch (error) {
      console.error('Failed to create mining rig:', error);
      alert('Failed to create mining rig: ' + (error as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  const createMiningPool = async () => {
    if (!miningPoolContract || !poolName || !poolUrl) return;
    
    // Check WATT balance
    const balance = parseFloat(wattBalance);
    if (balance < 100000) {
      alert('You need at least 100,000 WATT tokens to create a mining pool');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Approve WATT tokens first
      if (wattTokenContract) {
        const approvalTx = await wattTokenContract.approve(
          miningPoolContract.address,
          ethers.utils.parseEther('100000')
        );
        await approvalTx.wait();
      }
      
      const tx = await miningPoolContract.createMiningPool(
        poolName,
        poolUrl,
        Math.floor(poolFee * 100), // Convert to basis points
        ethers.utils.parseEther('1'), // 1 WATT minimum payout
        3600 // 1 hour payout interval
      );
      
      await tx.wait();
      
      alert('Mining pool created successfully! You can now host it on Netlify.');
      setShowPoolCreation(false);
      setPoolName('');
      setPoolUrl('');
      setPoolFee(2.5);
      
    } catch (error) {
      console.error('Failed to create mining pool:', error);
      alert('Failed to create mining pool: ' + (error as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRigPower = async (rigId: number, powerOn: boolean) => {
    if (!nftMiningRigContract) return;
    
    try {
      const tx = await nftMiningRigContract.toggleRigPower(rigId, powerOn);
      await tx.wait();
      
      // Refresh user data
      await loadUserData();
      
    } catch (error) {
      console.error('Failed to toggle rig power:', error);
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const { totalHashPower, totalWattConsumption, efficiency, genesisBadgeMultiplier } = calculateTotalStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Mining Game NFT Rig Builder</h1>
          <p className="text-xl text-gray-300">Configure your Mining Game NFTs for nuChain mining</p>
          {account && (
            <div className="flex justify-center items-center space-x-4 mt-4">
              <p className="text-sm text-gray-400">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              <p className="text-sm text-yellow-400">WATT Balance: {parseFloat(wattBalance).toLocaleString()}</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => switchNetwork(137)}
                  className={`px-3 py-1 rounded text-xs ${chainId === 137 ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                  Polygon
                </button>
                <button
                  onClick={() => switchNetwork(2330)}
                  className={`px-3 py-1 rounded text-xs ${chainId === 2330 ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                  Altcoinchain
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Components */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Settings className="mr-3" />
                Mining Game NFT Components
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableComponents.map((component) => {
                  const Icon = component.type === 'Graphics Card' ? Zap :
                              component.type === 'Processor' ? Cpu :
                              component.type === 'PC Case' ? Monitor :
                              component.type === 'Boost Item' ? Award : Settings;
                  
                  return (
                    <div
                      key={component.id}
                      className={`relative bg-white/5 rounded-xl p-4 border transition-all cursor-pointer hover:scale-105 ${
                        selectedComponents.some(c => c.id === component.id) 
                          ? 'border-purple-400 bg-purple-400/10' 
                          : 'border-white/10 hover:border-purple-400'
                      }`}
                      onClick={() => addComponent(component)}
                    >
                      {/* Rarity Border */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(component.rarity)} rounded-xl p-[1px]`}>
                        <div className="bg-slate-800/90 rounded-xl h-full w-full" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 mr-2 text-blue-400" />
                            <span className="text-sm font-medium">{component.type}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${getRarityColor(component.rarity)} bg-clip-text text-transparent`}>
                            {component.rarity}
                          </span>
                        </div>
                        
                        <div className="w-full h-32 bg-gray-800 rounded-lg mb-3 flex items-center justify-center">
                          <Icon className="w-12 h-12 text-gray-600" />
                        </div>
                        
                        <h3 className="font-semibold mb-2">{component.name}</h3>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div className="flex justify-between">
                            <span>Hash Rate:</span>
                            <span className="text-emerald-400">{component.hashRateBonus}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Power:</span>
                            <span className="text-yellow-400">{component.powerConsumption}</span>
                          </div>
                          {component.vram && (
                            <div className="flex justify-between">
                              <span>VRAM:</span>
                              <span>{component.vram}</span>
                            </div>
                          )}
                          {component.cores && (
                            <div className="flex justify-between">
                              <span>Cores:</span>
                              <span>{component.cores}</span>
                            </div>
                          )}
                          {component.special && (
                            <div className="text-purple-400 text-xs mt-2">{component.special}</div>
                          )}
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-gray-700">
                          <p className="text-xs text-gray-500 font-mono">
                            {component.contract}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rig Builder */}
          <div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-2xl font-bold mb-6">Build Your Mining Rig</h2>
              
              {/* Genesis Badge Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Genesis Badge NFT ID (Optional)</label>
                <input
                  type="number"
                  value={genesisBadgeId}
                  onChange={(e) => setGenesisBadgeId(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  placeholder="Enter Genesis Badge ID"
                />
                {genesisBadgeId > 0 && (
                  <p className="text-sm text-green-400 mt-1">
                    Multiplier: {getGenesisBadgeMultiplier(genesisBadgeId)}%
                  </p>
                )}
              </div>

              {/* Selected Components */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Selected Components ({selectedComponents.length}/8)</h3>
                <div className="space-y-2">
                  {selectedComponents.map((component) => (
                    <div
                      key={`${component.id}-${Math.random()}`}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                    >
                      <div>
                        <div className="font-medium">{component.name}</div>
                        <div className="text-sm text-gray-400">{component.type} • {component.rarity}</div>
                      </div>
                      <button
                        onClick={() => removeComponent(component.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {selectedComponents.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Select components to build your mining rig</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Rig Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Hash Power:</span>
                    <span className="font-mono text-emerald-400">{totalHashPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WATT Consumption:</span>
                    <span className="font-mono text-yellow-400">{totalWattConsumption}/block</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efficiency:</span>
                    <span className="font-mono text-blue-400">{efficiency}</span>
                  </div>
                  {genesisBadgeId > 0 && (
                    <div className="flex justify-between text-purple-400">
                      <span>Genesis Multiplier:</span>
                      <span className="font-mono">{genesisBadgeMultiplier}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={createMiningRig}
                disabled={selectedComponents.length === 0 || isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
              >
                {isLoading ? 'Creating Mining Rig...' : 'Create Mining Rig NFT'}
              </button>
            </div>

            {/* Mining Pool Creation */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4">Mining Pool Operations</h2>
              
              <div className="mb-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  💡 Pool operators stake 100,000 WATT and mine without WATT fees
                </p>
              </div>
              
              {!showPoolCreation ? (
                <button
                  onClick={() => setShowPoolCreation(true)}
                  disabled={parseFloat(wattBalance) < 100000}
                  className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  {parseFloat(wattBalance) >= 100000 ? 'Create Mining Pool' : 'Need 100,000 WATT'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Pool Name</label>
                    <input
                      type="text"
                      value={poolName}
                      onChange={(e) => setPoolName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                      placeholder="My Mining Pool"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Netlify URL</label>
                    <input
                      type="url"
                      value={poolUrl}
                      onChange={(e) => setPoolUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                      placeholder="https://mypool.netlify.app"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Host your pool dashboard on Netlify for miners to join
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Pool Fee (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={poolFee}
                      onChange={(e) => setPoolFee(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>
                  
                  <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">
                    ⚠️ This will stake 100,000 WATT tokens in your pool contract
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={createMiningPool}
                      disabled={isLoading || !poolName || !poolUrl}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      {isLoading ? 'Creating Pool...' : 'Stake 100k WATT & Create'}
                    </button>
                    <button
                      onClick={() => setShowPoolCreation(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User's Mining Rigs */}
        {userRigs.length > 0 && (
          <div className="mt-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-6">Your Mining Rigs</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userRigs.map((rig) => (
                  <div
                    key={rig.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{rig.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          rig.status === 'mining' ? 'bg-green-600' : 
                          rig.status === 'idle' ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}>
                          {rig.status.toUpperCase()}
                        </span>
                        <button
                          onClick={() => toggleRigPower(rig.id, !rig.isPoweredOn)}
                          className={`p-2 rounded-lg transition-all ${
                            rig.isPoweredOn
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Hash Power:</span>
                        <span className="font-mono text-emerald-400">{rig.totalHashPower.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WATT Cost:</span>
                        <span className="font-mono text-yellow-400">{rig.totalWattConsumption}/block</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efficiency:</span>
                        <span className="font-mono text-blue-400">{rig.efficiency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multiplier:</span>
                        <span className="font-mono text-purple-400">{rig.genesisBadgeMultiplier}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Earnings:</span>
                        <span className="font-mono text-green-400">{rig.earnings}</span>
                      </div>
                      {rig.pool && (
                        <div className="flex justify-between">
                          <span>Pool:</span>
                          <span className="font-mono">{rig.pool}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-400/10 border border-blue-400/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">For Miners:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Configure mining rigs from your Mining Game NFTs</li>
                <li>• Join mining pools to share rewards</li>
                <li>• Pay WATT tokens based on your rig's power consumption</li>
                <li>• Earn NU tokens from nuChain mining</li>
                <li>• Stake powered-off rigs to earn WATT from the consumption pool</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">For Pool Operators:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Stake 100,000 WATT tokens to create a pool</li>
                <li>• Mine nuChain without paying WATT fees</li>
                <li>• Host your pool dashboard on Netlify</li>
                <li>• Earn fees from miners in your pool</li>
                <li>• Manage pool settings and payouts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiningRigBuilder;