import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Settings, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Award,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import ThreeDViewer from './ThreeDViewer';

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  polygon: {
    nftContract: '0x970a8b10147e3459d3cbf56329b76ac18d329728',
    wattToken: '0xE960d5076cd3169C343Ee287A2c3380A222e5839',
    nftStaking: '0xcbfcA68D10B2ec60a0FB2Bc58F7F0Bfd32CD5275'
  },
  altcoinchain: {
    nftContract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
    wattToken: '0x6645143e49B3a15d8F205658903a55E520444698',
    nftStaking: '0xe463045318393095F11ed39f1a98332aBCc1A7b1'
  },
  localhost: {
    nftContract: '0x0000000000000000000000000000000000000000',
    wattToken: '0x0000000000000000000000000000000000000000',
    nftStaking: '0x0000000000000000000000000000000000000000'
  }
};

// Mining Game NFT components data
const MINING_GAME_COMPONENTS = [
  {
    id: 1,
    name: "FREE MINT GAMING PC",
    description: "The basic PC needed to play the Mining Game. Free to mint! This NFT receives Play to Earn Rewards.",
    image: "https://api.mining.game/1.png",
    animation_url: "https://api.mining.game/1.glb",
    hashPower: 2,
    wattUsage: 5,
    stakeWeight: 1,
    componentType: "case",
    required: true
  },
  {
    id: 2,
    name: "GENESIS BADGE",
    description: "The exclusive Genesis Badge, increasing luck and efficiency with 10%! Only 100 will ever be minted!",
    image: "https://api.mining.game/2.jpg",
    animation_url: "https://api.mining.game/2.mp4",
    hashPower: 0,
    wattUsage: 0,
    stakeWeight: 42,
    componentType: "badge",
    multiplier: 110 // 10% boost
  },
  {
    id: 3,
    name: "XL1 PROCESSOR",
    description: "CPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
    image: "https://api.mining.game/3.png",
    animation_url: "https://api.mining.game/3.glb",
    hashPower: 10,
    wattUsage: 2,
    stakeWeight: 9,
    componentType: "cpu",
    required: true
  },
  {
    id: 4,
    name: "TX120 GPU",
    description: "GPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
    image: "https://api.mining.game/4.png",
    animation_url: "https://api.mining.game/4.glb",
    hashPower: 20,
    wattUsage: 10,
    stakeWeight: 11,
    componentType: "gpu",
    maxQuantity: 1
  },
  {
    id: 5,
    name: "GP50 GPU",
    description: "A powerful GPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
    image: "https://api.mining.game/5.png",
    animation_url: "https://api.mining.game/5.glb",
    hashPower: 33,
    wattUsage: 16,
    stakeWeight: 18,
    componentType: "gpu",
    maxQuantity: 1
  }
];

interface MiningRig {
  id: string;
  name: string;
  components: number[];
  totalHashPower: number;
  totalWattConsumption: number;
  isActive: boolean;
  selectedPool: string;
  selectedChain: 'polygon' | 'altcoinchain';
  createdAt: number;
}

interface StakedNFT {
  id: number;
  name: string;
  image: string;
  animation_url: string;
  dailyRewards: number;
  isStaked: boolean;
  canClaim: boolean;
}

const MiningRigBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'build' | 'manage' | 'stake' | 'watt-stake'>('build');
  const [selectedComponents, setSelectedComponents] = useState<number[]>([]);
  const [rigName, setRigName] = useState('');
  const [selectedPool, setSelectedPool] = useState('direct');
  const [selectedChain, setSelectedChain] = useState<'polygon' | 'altcoinchain'>('polygon');
  const [miningRigs, setMiningRigs] = useState<MiningRig[]>([]);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([]);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showWattStakeModal, setShowWattStakeModal] = useState(false);
  const [wattStakeAmount, setWattStakeAmount] = useState('');

  useEffect(() => {
    initializeWeb3();
    loadStakedNFTs();
  }, []);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const loadStakedNFTs = () => {
    // Mock staked NFTs data - replace with actual contract calls
    const mockStakedNFTs: StakedNFT[] = MINING_GAME_COMPONENTS.map(component => ({
      id: component.id,
      name: component.name,
      image: component.image,
      animation_url: component.animation_url,
      dailyRewards: Math.random() * 10,
      isStaked: Math.random() > 0.5,
      canClaim: Math.random() > 0.7
    }));
    
    setStakedNFTs(mockStakedNFTs);
  };

  const validateRigConfiguration = () => {
    const errors: string[] = [];
    
    // Check required components
    const hasCase = selectedComponents.includes(1);
    const hasCPU = selectedComponents.includes(3);
    const gpuComponents = selectedComponents.filter(id => [4, 5].includes(id));
    
    if (!hasCase) errors.push("PC Case (ID 1) is required");
    if (!hasCPU) errors.push("XL1 Processor (ID 3) is required");
    if (gpuComponents.length === 0) errors.push("At least 1 GPU is required");
    if (gpuComponents.length > 2) errors.push("Maximum 2 GPUs allowed");
    
    // Check GPU limits
    const tx120Count = selectedComponents.filter(id => id === 4).length;
    const gp50Count = selectedComponents.filter(id => id === 5).length;
    
    if (tx120Count > 1) errors.push("Maximum 1 TX120 GPU allowed");
    if (gp50Count > 1) errors.push("Maximum 1 GP50 GPU allowed");
    
    return errors;
  };

  const calculateRigStats = () => {
    let totalHashPower = 0;
    let totalWattConsumption = 0;
    let multiplier = 100; // Base 100%
    
    selectedComponents.forEach(componentId => {
      const component = MINING_GAME_COMPONENTS.find(c => c.id === componentId);
      if (component) {
        if (component.componentType === 'badge') {
          multiplier = component.multiplier || 100;
        } else {
          totalHashPower += component.hashPower;
          totalWattConsumption += component.wattUsage;
        }
      }
    });
    
    // Apply Genesis Badge multiplier
    totalHashPower = Math.floor((totalHashPower * multiplier) / 100);
    
    return { totalHashPower, totalWattConsumption };
  };

  const createMiningRig = async () => {
    const errors = validateRigConfiguration();
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }
    
    if (!rigName.trim()) {
      toast.error('Please enter a rig name');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { totalHashPower, totalWattConsumption } = calculateRigStats();
      
      const newRig: MiningRig = {
        id: Date.now().toString(),
        name: rigName,
        components: [...selectedComponents],
        totalHashPower,
        totalWattConsumption,
        isActive: false,
        selectedPool,
        selectedChain,
        createdAt: Date.now()
      };
      
      setMiningRigs([...miningRigs, newRig]);
      
      // Reset form
      setSelectedComponents([]);
      setRigName('');
      setShowBuildModal(false);
      
      toast.success(`Mining rig "${newRig.name}" created successfully!`);
      
    } catch (error) {
      console.error('Failed to create mining rig:', error);
      toast.error('Failed to create mining rig');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRigActive = async (rigId: string) => {
    try {
      setMiningRigs(rigs => 
        rigs.map(rig => 
          rig.id === rigId 
            ? { ...rig, isActive: !rig.isActive }
            : rig
        )
      );
      
      const rig = miningRigs.find(r => r.id === rigId);
      if (rig) {
        toast.success(`Mining rig "${rig.name}" ${!rig.isActive ? 'activated' : 'deactivated'}`);
      }
    } catch (error) {
      toast.error('Failed to toggle rig status');
    }
  };

  const deleteRig = async (rigId: string) => {
    try {
      const rig = miningRigs.find(r => r.id === rigId);
      setMiningRigs(rigs => rigs.filter(r => r.id !== rigId));
      toast.success(`Mining rig "${rig?.name}" deleted`);
    } catch (error) {
      toast.error('Failed to delete rig');
    }
  };

  const stakeNFTs = async () => {
    if (selectedNFTs.length === 0) {
      toast.error('Please select at least one NFT to stake');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Mock staking transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update staked status
      setStakedNFTs(nfts => 
        nfts.map(nft => 
          selectedNFTs.includes(nft.id)
            ? { ...nft, isStaked: true }
            : nft
        )
      );
      
      setSelectedNFTs([]);
      setShowStakeModal(false);
      toast.success('NFTs staked successfully!');
      
    } catch (error) {
      toast.error('Failed to stake NFTs');
    } finally {
      setIsLoading(false);
    }
  };

  const unstakeNFT = async (nftId: number) => {
    try {
      setStakedNFTs(nfts => 
        nfts.map(nft => 
          nft.id === nftId
            ? { ...nft, isStaked: false }
            : nft
        )
      );
      
      toast.success('NFT unstaked successfully!');
    } catch (error) {
      toast.error('Failed to unstake NFT');
    }
  };

  const claimRewards = async (nftId: number) => {
    try {
      const nft = stakedNFTs.find(n => n.id === nftId);
      if (nft) {
        toast.success(`Claimed ${nft.dailyRewards.toFixed(2)} WATT rewards!`);
        
        setStakedNFTs(nfts => 
          nfts.map(n => 
            n.id === nftId
              ? { ...n, dailyRewards: 0, canClaim: false }
              : n
          )
        );
      }
    } catch (error) {
      toast.error('Failed to claim rewards');
    }
  };

  const stakeWattTokens = async () => {
    if (!wattStakeAmount || parseFloat(wattStakeAmount) < 100) {
      toast.error('Minimum stake is 100 WATT tokens');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Show deployment reminder
      toast.error('WATT Stake contract needs to be deployed first! Please deploy the contract to both Altcoinchain and Polygon.');
      
    } catch (error) {
      toast.error('Failed to stake WATT tokens');
    } finally {
      setIsLoading(false);
      setShowWattStakeModal(false);
    }
  };

  const renderBuildTab = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <img 
            src="https://mining.game/logo.png" 
            alt="Mining Game Logo" 
            className="h-32 w-auto object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">NFT Mining Rig Builder</h1>
        <p className="text-xl text-gray-300">Configure your mining rigs using Mining Game NFT components</p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowBuildModal(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-4 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Build New Mining Rig</span>
        </button>
        
        <button
          onClick={() => setShowStakeModal(true)}
          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-8 py-4 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center space-x-2"
        >
          <Award className="w-5 h-5" />
          <span>Stake Mining Game NFTs</span>
        </button>
        
        <button
          onClick={() => setShowWattStakeModal(true)}
          className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 px-8 py-4 rounded-xl font-semibold text-white transition-all transform hover:scale-105 flex items-center space-x-2"
        >
          <DollarSign className="w-5 h-5" />
          <span>Stake WATT Tokens</span>
        </button>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {MINING_GAME_COMPONENTS.map((component) => (
          <motion.div
            key={component.id}
            className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 hover:border-purple-500 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative mb-4">
              {component.animation_url?.endsWith('.glb') ? (
                <ThreeDViewer
                  modelUrl={component.animation_url}
                  fallbackImage={component.image}
                  className="w-full h-48"
                  zoomLevel={[3, 4, 5].includes(component.id) ? 2 : 1}
                />
              ) : component.animation_url?.endsWith('.mp4') ? (
                <video
                  src={component.animation_url}
                  className="w-full h-48 object-cover rounded-lg"
                  autoPlay
                  loop
                  muted
                />
              ) : (
                <img
                  src={component.image}
                  alt={component.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">{component.name}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Hash Power:</span>
                <span className="text-green-400 font-semibold">{component.hashPower}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">WATT Usage:</span>
                <span className="text-yellow-400 font-semibold">{component.wattUsage}/block</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stake Weight:</span>
                <span className="text-blue-400 font-semibold">{component.stakeWeight}</span>
              </div>
            </div>
            
            {component.multiplier && (
              <div className="mt-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-2">
                <div className="text-center text-yellow-400 font-semibold text-sm">
                  +{component.multiplier - 100}% Hash Power Boost
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderManageTab = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Manage Mining Rigs</h2>
        <p className="text-gray-300">Control your mining operations and monitor performance</p>
      </div>

      {miningRigs.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No mining rigs created yet</p>
          <button
            onClick={() => setShowBuildModal(true)}
            className="mt-4 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-white font-semibold transition-all"
          >
            Create Your First Rig
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {miningRigs.map((rig) => (
            <motion.div
              key={rig.id}
              className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{rig.name}</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  rig.isActive 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {rig.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Hash Power:</span>
                  <span className="text-green-400 font-semibold">{rig.totalHashPower.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">WATT/Block:</span>
                  <span className="text-yellow-400 font-semibold">{rig.totalWattConsumption}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily Cost:</span>
                  <span className="text-red-400 font-semibold">
                    {(rig.totalWattConsumption * 172800).toLocaleString()} WATT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mining Pool:</span>
                  <span className="text-blue-400 font-semibold">
                    {rig.selectedPool === 'direct' ? 'Direct Mining' : `Pool ${rig.selectedPool}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain:</span>
                  <span className="text-purple-400 font-semibold capitalize">{rig.selectedChain}</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleRigActive(rig.id)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                    rig.isActive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {rig.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{rig.isActive ? 'Stop' : 'Start'}</span>
                </button>
                
                <button
                  onClick={() => deleteRig(rig.id)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStakeTab = () => (
    <div className="min-h-screen bg-black text-white">
      {/* Header matching stake.mining.game */}
      <div className="text-center py-8">
        <div className="flex justify-center mb-6">
          <img 
            src="https://mining.game/logo.png" 
            alt="Mining Game Logo" 
            className="h-32 w-auto object-contain"
          />
        </div>
        
        {/* Navigation tabs */}
        <div className="flex justify-center space-x-8 mb-8">
          <span className="text-yellow-400 border-b-2 border-yellow-400 pb-2 cursor-pointer">Inventory</span>
          <span className="text-green-400 hover:text-green-300 cursor-pointer">NFT-staking</span>
          <span className="text-green-400 hover:text-green-300 cursor-pointer">Token-staking</span>
          <span className="text-green-400 hover:text-green-300 cursor-pointer">Multi-send</span>
        </div>
        
        <h2 className="text-3xl font-bold mb-4">Inventory</h2>
      </div>

      {/* NFT Grid matching stake.mining.game design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 px-8">
        {stakedNFTs.map((nft) => (
          <motion.div
            key={nft.id}
            className={`bg-gray-900 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedNFTs.includes(nft.id)
                ? 'border-green-400 bg-green-900/20'
                : 'border-green-600 hover:border-green-400'
            }`}
            onClick={() => {
              if (selectedNFTs.includes(nft.id)) {
                setSelectedNFTs(selectedNFTs.filter(id => id !== nft.id));
              } else {
                setSelectedNFTs([...selectedNFTs, nft.id]);
              }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Refresh button */}
            <div className="flex justify-end p-2">
              <RefreshCw className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
            </div>
            
            {/* 3D Model or Image */}
            <div className="px-4 pb-4">
              {nft.animation_url?.endsWith('.glb') ? (
                <ThreeDViewer
                  modelUrl={nft.animation_url}
                  fallbackImage={nft.image}
                  className="w-full h-56 bg-gray-800 rounded-lg"
                  zoomLevel={[3, 4, 5].includes(nft.id) ? 2 : 1}
                />
              ) : nft.animation_url?.endsWith('.mp4') ? (
                <video
                  src={nft.animation_url}
                  className="w-full h-56 object-cover rounded-lg bg-gray-800"
                  autoPlay
                  loop
                  muted
                />
              ) : (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-56 object-cover rounded-lg bg-gray-800"
                />
              )}
            </div>
            
            {/* NFT Info */}
            <div className="px-4 pb-4">
              <h3 className="text-lg font-bold text-center mb-4">{nft.name}</h3>
              
              {/* Daily Rewards */}
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="text-green-400 text-sm">DAILY</span>
                <span className="text-white font-bold">{nft.dailyRewards.toFixed(2)}</span>
                <img src="/favicon.ico" alt="WATT" className="w-5 h-5" />
              </div>
              
              {/* Action Button */}
              <div className="text-center">
                {!nft.isStaked ? (
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                    STAKE
                  </button>
                ) : nft.canClaim ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      claimRewards(nft.id);
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    CLAIM
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      unstakeNFT(nft.id);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    UNSTAKE
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderWattStakeTab = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">WATT Token Staking</h2>
        <p className="text-gray-300">Stake WATT tokens to earn annual interest</p>
      </div>

      {/* Staking Parameters */}
      <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">Staking Parameters</h3>
        
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">10%</div>
            <div className="text-gray-400">Annual Interest Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">365</div>
            <div className="text-gray-400">Days Maturity</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">25%</div>
            <div className="text-gray-400">Early Withdrawal Penalty</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">100</div>
            <div className="text-gray-400">Minimum WATT</div>
          </div>
        </div>

        {/* Deployment Warning */}
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h4 className="font-semibold text-red-400">Contract Not Deployed</h4>
              <p className="text-red-300 text-sm">
                The WATT Stake contract needs to be deployed to both Altcoinchain and Polygon before staking is available.
              </p>
            </div>
          </div>
        </div>

        {/* Staking Calculator */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 font-semibold mb-2">WATT Amount to Stake</label>
            <input
              type="number"
              value={wattStakeAmount}
              onChange={(e) => setWattStakeAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              placeholder="Enter WATT amount (minimum 100)"
              min="100"
            />
          </div>
          
          {wattStakeAmount && parseFloat(wattStakeAmount) >= 100 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Estimated Returns</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Staked Amount:</span>
                  <span className="text-white">{parseFloat(wattStakeAmount).toLocaleString()} WATT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Annual Interest (10%):</span>
                  <span className="text-green-400">{(parseFloat(wattStakeAmount) * 0.1).toLocaleString()} WATT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Interest:</span>
                  <span className="text-green-400">{(parseFloat(wattStakeAmount) * 0.1 / 12).toFixed(2)} WATT</span>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={stakeWattTokens}
            disabled={!wattStakeAmount || parseFloat(wattStakeAmount) < 100}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-semibold text-white transition-all"
          >
            Stake WATT Tokens
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-700">
            {[
              { key: 'build', label: 'Build Rigs', icon: Settings },
              { key: 'manage', label: 'Manage Rigs', icon: Zap },
              { key: 'stake', label: 'Stake NFTs', icon: Award },
              { key: 'watt-stake', label: 'Stake WATT', icon: DollarSign }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${
                  activeTab === key
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'build' && renderBuildTab()}
        {activeTab === 'manage' && renderManageTab()}
        {activeTab === 'stake' && renderStakeTab()}
        {activeTab === 'watt-stake' && renderWattStakeTab()}

        {/* Build Mining Rig Modal */}
        <AnimatePresence>
          {showBuildModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Build Mining Rig</h2>
                  <button
                    onClick={() => setShowBuildModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Rig Name */}
                <div className="mb-6">
                  <label className="block text-gray-300 font-semibold mb-2">Mining Rig Name</label>
                  <input
                    type="text"
                    value={rigName}
                    onChange={(e) => setRigName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Enter a name for your mining rig"
                  />
                </div>

                {/* Component Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Select Components</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {MINING_GAME_COMPONENTS.map((component) => {
                      const isSelected = selectedComponents.includes(component.id);
                      const isGPU = component.componentType === 'gpu';
                      const selectedGPUs = selectedComponents.filter(id => [4, 5].includes(id));
                      const canSelect = !isSelected && (!isGPU || selectedGPUs.length < 2);
                      
                      return (
                        <div
                          key={component.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-green-400 bg-green-900/20'
                              : canSelect
                              ? 'border-gray-600 hover:border-purple-400'
                              : 'border-gray-700 opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => {
                            if (canSelect) {
                              setSelectedComponents([...selectedComponents, component.id]);
                            } else if (isSelected) {
                              setSelectedComponents(selectedComponents.filter(id => id !== component.id));
                            }
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            {isSelected && <Check className="w-5 h-5 text-green-400" />}
                            <div>
                              <div className="font-semibold text-white text-sm">{component.name}</div>
                              <div className="text-xs text-gray-400">
                                {component.hashPower} HP • {component.wattUsage} WATT
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Validation Messages */}
                  {validateRigConfiguration().length > 0 && (
                    <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-3">
                      <div className="text-red-400 text-sm">
                        {validateRigConfiguration().map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mining Configuration */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Mining Configuration</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-2">Blockchain</label>
                      <select
                        value={selectedChain}
                        onChange={(e) => setSelectedChain(e.target.value as 'polygon' | 'altcoinchain')}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="polygon">Polygon</option>
                        <option value="altcoinchain">Altcoinchain</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 font-semibold mb-2">Mining Pool</label>
                      <select
                        value={selectedPool}
                        onChange={(e) => setSelectedPool(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="direct">Direct Mining (Full WATT Cost)</option>
                        <option value="pool1">Elite Mining Pool (2.5% fee)</option>
                        <option value="pool2">Pro Mining Pool (3.0% fee)</option>
                        <option value="pool3">Community Pool (1.5% fee)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Rig Stats Preview */}
                {selectedComponents.length > 0 && (
                  <div className="mb-6 bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Rig Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Hash Power:</span>
                        <span className="text-green-400 font-semibold">{calculateRigStats().totalHashPower.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">WATT per Block:</span>
                        <span className="text-yellow-400 font-semibold">{calculateRigStats().totalWattConsumption}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Daily WATT Cost:</span>
                        <span className="text-red-400 font-semibold">
                          {(calculateRigStats().totalWattConsumption * 172800).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Components:</span>
                        <span className="text-blue-400 font-semibold">{selectedComponents.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowBuildModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createMiningRig}
                    disabled={validateRigConfiguration().length > 0 || !rigName.trim() || isLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                  >
                    {isLoading ? 'Creating...' : 'Create Mining Rig'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stake NFTs Modal */}
        <AnimatePresence>
          {showStakeModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Stake Mining Game NFTs</h2>
                  <button
                    onClick={() => setShowStakeModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {stakedNFTs.filter(nft => !nft.isStaked).map((nft) => (
                    <div
                      key={nft.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedNFTs.includes(nft.id)
                          ? 'border-green-400 bg-green-900/20'
                          : 'border-gray-600 hover:border-purple-400'
                      }`}
                      onClick={() => {
                        if (selectedNFTs.includes(nft.id)) {
                          setSelectedNFTs(selectedNFTs.filter(id => id !== nft.id));
                        } else {
                          setSelectedNFTs([...selectedNFTs, nft.id]);
                        }
                      }}
                    >
                      <img src={nft.image} alt={nft.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                      <h4 className="font-semibold text-white text-sm">{nft.name}</h4>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowStakeModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={stakeNFTs}
                    disabled={selectedNFTs.length === 0 || isLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                  >
                    {isLoading ? 'Staking...' : `Stake ${selectedNFTs.length} NFTs`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WATT Stake Modal */}
        <AnimatePresence>
          {showWattStakeModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-900 rounded-2xl p-8 max-w-lg w-full border border-gray-700"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Stake WATT Tokens</h2>
                  <button
                    onClick={() => setShowWattStakeModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Deployment Warning */}
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <div>
                      <h4 className="font-semibold text-red-400">Contract Not Deployed</h4>
                      <p className="text-red-300 text-sm">
                        Deploy the WATT Stake contract first using: npm run deploy:watt-stake
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-2">WATT Amount</label>
                    <input
                      type="number"
                      value={wattStakeAmount}
                      onChange={(e) => setWattStakeAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      placeholder="Minimum 100 WATT"
                      min="100"
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowWattStakeModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={stakeWattTokens}
                      disabled={!wattStakeAmount || parseFloat(wattStakeAmount) < 100}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                    >
                      Stake WATT
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MiningRigBuilder;