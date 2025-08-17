import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Upload, Cpu, HardDrive, MemoryStick, Zap, Settings, Power, Plus, Trash2 } from 'lucide-react';

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

interface Component {
  id: string;
  contractAddress: string;
  tokenId: number;
  type: 'CPU' | 'GPU' | 'MEMORY' | 'STORAGE' | 'MOTHERBOARD' | 'PSU' | 'COOLING' | 'CASE';
  name: string;
  hashPower: number;
  wattConsumption: number;
  glbFile: string;
  image: string;
}

interface MiningRig {
  id: number;
  components: Component[];
  totalHashPower: number;
  totalWattConsumption: number;
  genesisBadgeMultiplier: number;
  isPoweredOn: boolean;
}

interface MiningPool {
  id: number;
  name: string;
  url: string;
  operator: string;
  feePercentage: number;
  totalHashPower: number;
  totalMiners: number;
}

const MiningRigBuilder: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [nftMiningRigContract, setNftMiningRigContract] = useState<ethers.Contract | null>(null);
  const [miningPoolContract, setMiningPoolContract] = useState<ethers.Contract | null>(null);
  
  // State
  const [selectedComponents, setSelectedComponents] = useState<Component[]>([]);
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [userRigs, setUserRigs] = useState<MiningRig[]>([]);
  const [availablePools, setAvailablePools] = useState<MiningPool[]>([]);
  const [genesisBadgeId, setGenesisBadgeId] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pool creation state
  const [showPoolCreation, setShowPoolCreation] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [poolUrl, setPoolUrl] = useState('');
  const [poolFee, setPoolFee] = useState(2.5);
  
  // Contract addresses (update with actual deployed addresses)
  const NFT_MINING_RIG_ADDRESS = '0x...'; // Replace with actual address
  const MINING_POOL_ADDRESS = '0x...'; // Replace with actual address
  const WATT_TOKEN_ADDRESS = '0x...'; // Replace with actual WATT token address

  useEffect(() => {
    initializeWeb3();
  }, []);

  useEffect(() => {
    if (account && nftMiningRigContract) {
      loadUserData();
    }
  }, [account, nftMiningRigContract]);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        
        setProvider(provider);
        setAccount(accounts[0]);
        
        const signer = provider.getSigner();
        const nftContract = new ethers.Contract(NFT_MINING_RIG_ADDRESS, NFT_MINING_RIG_ABI, signer);
        const poolContract = new ethers.Contract(MINING_POOL_ADDRESS, MINING_POOL_ABI, signer);
        
        setNftMiningRigContract(nftContract);
        setMiningPoolContract(poolContract);
        
        // Load available components (mock data - replace with actual contract calls)
        loadAvailableComponents();
        
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
      }
    }
  };

  const loadAvailableComponents = () => {
    // Mock data - replace with actual calls to Mining Game NFT contracts
    const mockComponents: Component[] = [
      {
        id: '1',
        contractAddress: '0x123...', // Mining Game GPU contract
        tokenId: 1,
        type: 'GPU',
        name: 'RTX 4090',
        hashPower: 2000000,
        wattConsumption: 450,
        glbFile: '/models/rtx4090.glb',
        image: '/images/rtx4090.jpg'
      },
      {
        id: '2',
        contractAddress: '0x123...',
        tokenId: 2,
        type: 'GPU',
        name: 'RTX 4080',
        hashPower: 1500000,
        wattConsumption: 320,
        glbFile: '/models/rtx4080.glb',
        image: '/images/rtx4080.jpg'
      },
      {
        id: '3',
        contractAddress: '0x456...', // Mining Game CPU contract
        tokenId: 1,
        type: 'CPU',
        name: 'Intel i9-13900K',
        hashPower: 500000,
        wattConsumption: 125,
        glbFile: '/models/i9-13900k.glb',
        image: '/images/i9-13900k.jpg'
      },
      {
        id: '4',
        contractAddress: '0x456...',
        tokenId: 2,
        type: 'CPU',
        name: 'AMD Ryzen 9 7950X',
        hashPower: 480000,
        wattConsumption: 120,
        glbFile: '/models/ryzen-7950x.glb',
        image: '/images/ryzen-7950x.jpg'
      },
      {
        id: '5',
        contractAddress: '0x789...', // Mining Game Memory contract
        tokenId: 1,
        type: 'MEMORY',
        name: 'DDR5-6000 32GB',
        hashPower: 50000,
        wattConsumption: 20,
        glbFile: '/models/ddr5-32gb.glb',
        image: '/images/ddr5-32gb.jpg'
      }
    ];
    
    setAvailableComponents(mockComponents);
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
        rigs.push({
          id: rigId.toNumber(),
          components: [], // Would load component details
          totalHashPower: rigData.totalHashPower.toNumber(),
          totalWattConsumption: rigData.totalWattConsumption.toNumber(),
          genesisBadgeMultiplier: rigData.genesisBadgeMultiplier.toNumber(),
          isPoweredOn: rigData.isPoweredOn
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
    
    // Check if component type already exists (except for multiple GPUs)
    if (component.type !== 'GPU') {
      const existingComponent = selectedComponents.find(c => c.type === component.type);
      if (existingComponent) {
        alert(`Only one ${component.type} component allowed per rig`);
        return;
      }
    }
    
    setSelectedComponents([...selectedComponents, component]);
  };

  const removeComponent = (componentId: string) => {
    setSelectedComponents(selectedComponents.filter(c => c.id !== componentId));
  };

  const calculateTotalStats = () => {
    const totalHashPower = selectedComponents.reduce((sum, c) => sum + c.hashPower, 0);
    const totalWattConsumption = selectedComponents.reduce((sum, c) => sum + c.wattConsumption, 0);
    
    // Apply Genesis Badge multiplier
    const multiplier = genesisBadgeId > 0 ? getGenesisBadgeMultiplier(genesisBadgeId) : 100;
    const adjustedHashPower = (totalHashPower * multiplier) / 100;
    
    return { totalHashPower: adjustedHashPower, totalWattConsumption };
  };

  const getGenesisBadgeMultiplier = (badgeId: number): number => {
    if (badgeId <= 100) return 200; // 200% for ultra rare
    if (badgeId <= 500) return 150; // 150% for rare
    if (badgeId <= 2000) return 125; // 125% for uncommon
    return 110; // 110% for common
  };

  const createMiningRig = async () => {
    if (!nftMiningRigContract || selectedComponents.length === 0) return;
    
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
      alert('Failed to create mining rig');
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

  const createMiningPool = async () => {
    if (!miningPoolContract || !poolName || !poolUrl) return;
    
    try {
      setIsLoading(true);
      
      const tx = await miningPoolContract.createMiningPool(
        poolName,
        poolUrl,
        Math.floor(poolFee * 100), // Convert to basis points
        ethers.utils.parseEther('1'), // 1 WATT minimum payout
        3600 // 1 hour payout interval
      );
      
      await tx.wait();
      
      alert('Mining pool created successfully!');
      setShowPoolCreation(false);
      setPoolName('');
      setPoolUrl('');
      setPoolFee(2.5);
      
    } catch (error) {
      console.error('Failed to create mining pool:', error);
      alert('Failed to create mining pool. Make sure you have 100,000 WATT tokens.');
    } finally {
      setIsLoading(false);
    }
  };

  const { totalHashPower, totalWattConsumption } = calculateTotalStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Mining Rig Builder</h1>
          <p className="text-xl text-gray-300">Configure your NFT mining rigs for nuChain mining</p>
          {account && (
            <p className="text-sm text-gray-400 mt-2">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Components */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Settings className="mr-3" />
                Available Components
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableComponents.map((component) => (
                  <div
                    key={component.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-400 transition-all cursor-pointer"
                    onClick={() => addComponent(component)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {component.type === 'GPU' && <Zap className="w-5 h-5 mr-2 text-yellow-400" />}
                        {component.type === 'CPU' && <Cpu className="w-5 h-5 mr-2 text-blue-400" />}
                        {component.type === 'MEMORY' && <MemoryStick className="w-5 h-5 mr-2 text-green-400" />}
                        {component.type === 'STORAGE' && <HardDrive className="w-5 h-5 mr-2 text-purple-400" />}
                        <span className="text-sm font-medium">{component.type}</span>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    <img
                      src={component.image}
                      alt={component.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                      onError={(e) => {
                        e.currentTarget.src = '/api/placeholder/200/128';
                      }}
                    />
                    
                    <h3 className="font-semibold mb-2">{component.name}</h3>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>Hash Power: {component.hashPower.toLocaleString()}</div>
                      <div>WATT Cost: {component.wattConsumption}/block</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rig Builder */}
          <div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-2xl font-bold mb-6">Build Your Rig</h2>
              
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
                        <div className="text-sm text-gray-400">{component.type}</div>
                      </div>
                      <button
                        onClick={() => removeComponent(component.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Rig Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Hash Power:</span>
                    <span className="font-mono">{totalHashPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WATT Consumption:</span>
                    <span className="font-mono">{totalWattConsumption}/block</span>
                  </div>
                  {genesisBadgeId > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Genesis Multiplier:</span>
                      <span className="font-mono">{getGenesisBadgeMultiplier(genesisBadgeId)}%</span>
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
                {isLoading ? 'Creating...' : 'Create Mining Rig NFT'}
              </button>
            </div>

            {/* Mining Pool Creation */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4">Mining Pool</h2>
              
              {!showPoolCreation ? (
                <button
                  onClick={() => setShowPoolCreation(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Create Mining Pool
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
                  
                  <div className="text-sm text-yellow-400 bg-yellow-400/10 p-3 rounded-lg">
                    ⚠️ Requires 100,000 WATT tokens to create a pool
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={createMiningPool}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      {isLoading ? 'Creating...' : 'Create Pool'}
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
                      <h3 className="text-lg font-semibold">Rig #{rig.id}</h3>
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
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Hash Power:</span>
                        <span className="font-mono">{rig.totalHashPower.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WATT Cost:</span>
                        <span className="font-mono">{rig.totalWattConsumption}/block</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multiplier:</span>
                        <span className="font-mono">{rig.genesisBadgeMultiplier}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={rig.isPoweredOn ? 'text-green-400' : 'text-gray-400'}>
                          {rig.isPoweredOn ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiningRigBuilder;