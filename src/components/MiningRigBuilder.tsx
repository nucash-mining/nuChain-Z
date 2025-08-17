import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Cpu, HardDrive, Monitor, Award, Plus, Minus, Settings, Wallet, ExternalLink, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import ThreeDViewer from './ThreeDViewer';

// Logo constants
const WATT_LOGO = "https://github.com/The-Mining-Game/Graphics/blob/main/Logo%20Watt/Watt%20Logo%20-%20Illustrator/Watt-Logo128px.png?raw=true";
const MINING_GAME_LOGO = "https://github.com/The-Mining-Game/Graphics/blob/main/Mining%20Game%20Logo/logo_1.png?raw=true";

interface ComponentMetadata {
  name: string;
  description: string;
  image: string;
  image_small?: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  specs?: string;
}

interface Component {
  id: number;
  name: string;
  type: 'processor' | 'gpu' | 'case' | 'boost';
  hashpower: number;
  wattUsage: number;
  stakeWeight: number;
  image: string;
  animation_url?: string;
  brand: string;
  generation: string;
  description: string;
  balance: number;
  metadata?: ComponentMetadata;
}

interface NetworkConfig {
  chainId: number;
  name: string;
  nftContract: string;
  wattContract: string;
  stakingContract: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls?: string[];
}

const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    nftContract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Replace with actual deployed address
    wattContract: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Replace with actual deployed address
    stakingContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Replace with actual deployed address
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['http://localhost:8545']
  },
  altcoinchain: {
    chainId: 2330,
    name: 'Altcoinchain',
    nftContract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
    wattContract: '0x6645143e49B3a15d8F205658903a55E520444698',
    stakingContract: '0xe463045318393095F11ed39f1a98332aBCc1A7b1',
    rpcUrl: 'https://rpc.altcoinchain.network',
    nativeCurrency: {
      name: 'Altcoin',
      symbol: 'ALT',
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.altcoinchain.network']
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    nftContract: '0x970a8b10147e3459d3cbf56329b76ac18d329728',
    wattContract: '0xE960d5076cd3169C343Ee287A2c3380A222e5839',
    stakingContract: '0xcbfcA68D10B2ec60a0FB2Bc58F7F0Bfd32CD5275',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrls: ['https://polygonscan.com']
  }
};

const MiningRigBuilder: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<string>('altcoinchain');
  const [account, setAccount] = useState<string>('');
  const [wattBalance, setWattBalance] = useState<string>('0');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<Component[]>([]);
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Component metadata with real Mining Game data
  const componentMetadata: Record<number, ComponentMetadata> = {
    1: {
      name: "Free mint Gaming PC",
      description: "The basic PC needed to play the Mining Game. Free to mint! This NFT receives Play to Earn Rewards.",
      image: "https://api.mining.game/1.png",
      image_small: "https://api.mining.game/1.jpg",
      animation_url: "https://api.mining.game/1.glb",
      specs: "102200050000000000",
      attributes: [
        { trait_type: "Brand", value: "Minga" },
        { trait_type: "Component", value: "Basic PC" },
        { trait_type: "Generation", value: "Gen1" },
        { display_type: "boost_number", trait_type: "Mining Hashpower", value: 2 },
        { display_type: "boost_number", trait_type: "WATT Usage", value: 5 },
        { display_type: "boost_number", trait_type: "Stake Weight", value: 1 }
      ]
    },
    2: {
      name: "Genesis Badge",
      description: "The exclusive Genesis Badge, increasing luck and efficience with 10%! Only 100 will ever be minted! This NFT receives Play to Earn Rewards.",
      image: "https://api.mining.game/2.png",
      image_small: "https://api.mining.game/2.jpg",
      animation_url: "https://api.mining.game/2.mp4",
      specs: "101000000000001010",
      attributes: [
        { trait_type: "Component", value: "Badge" },
        { trait_type: "Generation", value: "Gen1" },
        { display_type: "boost_percentage", trait_type: "Luck Boost", value: 10 },
        { display_type: "boost_percentage", trait_type: "Efficiency multiplier", value: 10 },
        { display_type: "boost_number", trait_type: "Stake Weight", value: 42 }
      ]
    },
    3: {
      name: "XL1 Processor",
      description: "CPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
      image: "https://api.mining.game/3.png",
      image_small: "https://api.mining.game/3.jpg",
      animation_url: "https://api.mining.game/3.glb",
      specs: "103300070000000000",
      attributes: [
        { trait_type: "Brand", value: "Kirtex" },
        { trait_type: "Component", value: "Processor" },
        { trait_type: "Generation", value: "Gen1" },
        { display_type: "boost_number", trait_type: "Mining Hashpower", value: 10 },
        { display_type: "boost_number", trait_type: "WATT Usage", value: 2 },
        { display_type: "boost_number", trait_type: "Stake Weight", value: 9 }
      ]
    },
    4: {
      name: "TX120 GPU",
      description: "GPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
      image: "https://api.mining.game/4.png",
      image_small: "https://api.mining.game/4.jpg",
      animation_url: "https://api.mining.game/4.glb",
      specs: "104500100000000000",
      attributes: [
        { trait_type: "Brand", value: "Oblivia" },
        { trait_type: "Component", value: "GPU" },
        { trait_type: "Generation", value: "Gen1" },
        { display_type: "boost_number", trait_type: "Mining Hashpower", value: 20 },
        { display_type: "boost_number", trait_type: "WATT Usage", value: 10 },
        { display_type: "boost_number", trait_type: "Stake Weight", value: 11 }
      ]
    },
    5: {
      name: "GP50 GPU",
      description: "A powerful GPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
      image: "https://api.mining.game/5.png",
      image_small: "https://api.mining.game/5.jpg",
      animation_url: "https://api.mining.game/5.glb",
      specs: "104001000160090000",
      attributes: [
        { trait_type: "Brand", value: "MAD" },
        { trait_type: "Component", value: "GPU" },
        { trait_type: "Generation", value: "Gen1" },
        { display_type: "boost_number", trait_type: "Mining Hashpower", value: 33 },
        { display_type: "boost_number", trait_type: "WATT Usage", value: 16 },
        { display_type: "boost_number", trait_type: "Stake Weight", value: 18 }
      ]
    }
  };

  const initializeComponents = () => {
    const components: Component[] = [
      {
        id: 1,
        name: "Free mint Gaming PC",
        type: 'case',
        hashpower: 2,
        wattUsage: 5,
        stakeWeight: 1,
        image: "https://api.mining.game/1.png",
        animation_url: "https://api.mining.game/1.glb",
        brand: "Minga",
        generation: "Gen1",
        description: "The basic PC needed to play the Mining Game. Free to mint!",
        balance: 0,
        metadata: componentMetadata[1]
      },
      {
        id: 2,
        name: "Genesis Badge",
        type: 'boost',
        hashpower: 0,
        wattUsage: 0,
        stakeWeight: 42,
        image: "https://api.mining.game/2.png",
        animation_url: "https://api.mining.game/2.mp4",
        brand: "Mining Game",
        generation: "Gen1",
        description: "The exclusive Genesis Badge, increasing luck and efficience with 10%! Only 100 will ever be minted!",
        balance: 0,
        metadata: componentMetadata[2]
      },
      {
        id: 3,
        name: "XL1 Processor",
        type: 'processor',
        hashpower: 10,
        wattUsage: 2,
        stakeWeight: 9,
        image: "https://api.mining.game/3.png",
        animation_url: "https://api.mining.game/3.glb",
        brand: "Kirtex",
        generation: "Gen1",
        description: "CPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
        balance: 0,
        metadata: componentMetadata[3]
      },
      {
        id: 4,
        name: "TX120 GPU",
        type: 'gpu',
        hashpower: 20,
        wattUsage: 10,
        stakeWeight: 11,
        image: "https://api.mining.game/4.png",
        animation_url: "https://api.mining.game/4.glb",
        brand: "Oblivia",
        generation: "Gen1",
        description: "GPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
        balance: 0,
        metadata: componentMetadata[4]
      },
      {
        id: 5,
        name: "GP50 GPU",
        type: 'gpu',
        hashpower: 33,
        wattUsage: 16,
        stakeWeight: 18,
        image: "https://api.mining.game/5.png",
        animation_url: "https://api.mining.game/5.glb",
        brand: "MAD",
        generation: "Gen1",
        description: "A powerful GPU upgrade for your Gaming PC! This NFT receives Play to Earn Rewards.",
        balance: 0,
        metadata: componentMetadata[5]
      }
    ];

    setAvailableComponents(components);
  };

  useEffect(() => {
    initializeComponents();
    if (typeof window !== 'undefined' && window.ethereum) {
      checkConnection();
      // Auto-detect localhost network
      window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
        const numericChainId = parseInt(chainId, 16);
        if (numericChainId === 31337) {
          setSelectedNetwork('localhost');
        }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadWattBalance();
      loadNFTBalances();
    }
  }, [selectedNetwork, isConnected, account]);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      toast.success('Wallet connected successfully');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const switchNetwork = async (networkKey: string) => {
    const network = NETWORKS[networkKey];
    if (!network) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
      setSelectedNetwork(networkKey);
      toast.success(`Switched to ${network.name}`);
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to wallet, try to add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.blockExplorerUrls
            }]
          });
          // After adding, try to switch again
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${network.chainId.toString(16)}` }],
          });
          setSelectedNetwork(networkKey);
          toast.success(`Added and switched to ${network.name}`);
        } catch (addError) {
          console.error('Error adding network:', addError);
          toast.error(`Failed to add ${network.name} to wallet`);
        }
      } else {
        console.error('Error switching network:', error);
        toast.error('Failed to switch network');
      }
    }
  };

  const loadWattBalance = async () => {
    if (!isConnected || !account) return;

    try {
      const network = NETWORKS[selectedNetwork];
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      const wattContract = new ethers.Contract(
        network.wattContract,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );

      const balance = await wattContract.balanceOf(account);
      const formattedBalance = ethers.utils.formatEther(balance);
      setWattBalance(parseFloat(formattedBalance).toFixed(2));
    } catch (error) {
      console.error('Error loading WATT balance:', error);
      setWattBalance('0');
    }
  };

  const loadNFTBalances = async () => {
    if (!isConnected || !account) return;

    try {
      const network = NETWORKS[selectedNetwork];
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      const nftContract = new ethers.Contract(
        network.nftContract,
        ['function balanceOf(address, uint256) view returns (uint256)'],
        provider
      );

      const updatedComponents = await Promise.all(
        availableComponents.map(async (component) => {
          try {
            const balance = await nftContract.balanceOf(account, component.id);
            return { ...component, balance: balance.toNumber() };
          } catch (error) {
            console.error(`Error loading balance for component ${component.id}:`, error);
            return { ...component, balance: 0 };
          }
        })
      );

      setAvailableComponents(updatedComponents);
    } catch (error) {
      console.error('Error loading NFT balances:', error);
    }
  };

  const addComponent = (component: Component) => {
    if (component.balance <= 0) {
      toast.error('You don\'t own this component');
      return;
    }

    const existingComponent = selectedComponents.find(c => c.id === component.id);
    if (existingComponent) {
      toast.error('Component already added');
      return;
    }

    setSelectedComponents([...selectedComponents, component]);
    toast.success(`Added ${component.name}`);
  };

  const removeComponent = (componentId: number) => {
    setSelectedComponents(selectedComponents.filter(c => c.id !== componentId));
    toast.success('Component removed');
  };

  const calculateTotalStats = () => {
    const baseHashpower = selectedComponents.reduce((sum, c) => sum + c.hashpower, 0);
    const totalWattUsage = selectedComponents.reduce((sum, c) => sum + c.wattUsage, 0);
    const totalStakeWeight = selectedComponents.reduce((sum, c) => sum + c.stakeWeight, 0);
    
    // Apply Genesis Badge multiplier if present
    const genesisBadge = selectedComponents.find(c => c.id === 2);
    const multiplier = genesisBadge ? 1.1 : 1.0; // 10% boost
    const totalHashpower = Math.floor(baseHashpower * multiplier);

    return { totalHashpower, totalWattUsage, totalStakeWeight };
  };

  const buildMiningRig = async () => {
    if (selectedComponents.length === 0) {
      toast.error('Please select at least one component');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate building mining rig
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const stats = calculateTotalStats();
      toast.success(`Mining rig built! Total hashpower: ${stats.totalHashpower}`);
      setSelectedComponents([]);
    } catch (error) {
      console.error('Error building mining rig:', error);
      toast.error('Failed to build mining rig');
    } finally {
      setIsLoading(false);
    }
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'processor': return <Cpu className="w-5 h-5" />;
      case 'gpu': return <Monitor className="w-5 h-5" />;
      case 'case': return <HardDrive className="w-5 h-5" />;
      case 'boost': return <Award className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const renderMedia = (component: Component) => {
    const { animation_url, image } = component;
    
    // Handle video files (.mp4)
    if (animation_url?.includes('.mp4')) {
      return (
        <video
          src={animation_url}
          autoPlay
          loop
          muted
          className="w-full h-48 object-cover rounded-lg"
          onError={(e) => {
            // Fallback to still image
            const target = e.target as HTMLVideoElement;
            target.style.display = 'none';
            const img = target.nextElementSibling as HTMLImageElement;
            if (img) img.style.display = 'block';
          }}
        />
      );
    }
    
    // Handle 3D models (.glb)
    if (animation_url?.includes('.glb')) {
      return (
        <ThreeDViewer
          modelUrl={animation_url}
          fallbackImage={image}
          className="w-full h-48"
        />
      );
    }
    
    // Fallback to still image
    return (
      <img
        src={image}
        alt={component.name}
        className="w-full h-48 object-cover rounded-lg"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = 'https://via.placeholder.com/300x200?text=Loading...';
        }}
      />
    );
  };

  const stats = calculateTotalStats();
  const currentNetwork = NETWORKS[selectedNetwork];

  // Theme classes
  const bgClass = isDarkMode 
    ? "min-h-screen bg-black text-white" 
    : "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white";
  
  const cardClass = isDarkMode
    ? "bg-gray-900 border border-gray-700"
    : "bg-white/10 backdrop-blur-lg border border-white/20";
  
  const buttonClass = isDarkMode
    ? "bg-gray-800 hover:bg-gray-700 border border-gray-600"
    : "bg-white/10 text-gray-300 hover:bg-white/20";

  return (
    <div className={bgClass}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`absolute top-0 right-0 p-3 rounded-lg transition-all ${buttonClass}`}
          >
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          
          <div className="flex flex-col items-center justify-center mb-6">
            <img 
              src={MINING_GAME_LOGO} 
              alt="Mining Game" 
              className="w-32 h-32 mb-4"
            />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Mining Rig Builder
            </h1>
          </div>
          <p className="text-xl text-gray-300">Build your NFT mining rig from Mining Game components</p>
        </div>

        {/* Network Selection & Wallet */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            {Object.entries(NETWORKS).map(([key, network]) => (
              <button
                key={key}
                onClick={() => switchNetwork(key)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedNetwork === key
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {network.name}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="text-right">
                <p className="text-sm text-gray-400">Connected Account</p>
                <p className="font-mono text-sm">{account.slice(0, 6)}...{account.slice(-4)}</p>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-6 py-3 rounded-lg font-semibold transition-all"
              >
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* WATT Balance */}
        <div className={`${cardClass} rounded-2xl p-6 mb-8`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <img 
                  src={WATT_LOGO} 
                  alt="WATT" 
                  className="w-8 h-8 mr-3"
                />
                <h2 className="text-2xl font-bold">WATT Balance</h2>
              </div>
              <p className="text-4xl font-bold text-yellow-400">{wattBalance} WATT</p>
              <p className="text-sm text-gray-400 mt-2">
                Contract: {currentNetwork.wattContract}
              </p>
            </div>
            <img 
              src={WATT_LOGO} 
              alt="WATT Logo" 
              className="w-16 h-16"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Components */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Available Components</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableComponents.map((component) => (
                <motion.div
                  key={component.id}
                  whileHover={{ scale: 1.02 }}
                  className={`${cardClass} rounded-2xl p-6 hover:border-purple-400/50 transition-all cursor-pointer`}
                  onClick={() => addComponent(component)}
                >
                  <div className="relative overflow-hidden">
                    {renderMedia(component)}
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold">{component.name}</h3>
                      {getComponentIcon(component.type)}
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{component.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Brand:</span>
                        <span className="font-semibold">{component.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Generation:</span>
                        <span className="font-semibold">{component.generation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Token ID:</span>
                        <span className="font-mono">#{component.id}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        NFT Contract: {currentNetwork.nftContract}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available:</span>
                        <span className="font-bold text-green-400">{component.balance}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                      <div className="bg-purple-600/20 rounded-lg p-2 text-center">
                        <p className="text-purple-400">Hashpower</p>
                        <p className="font-bold">{component.hashpower}</p>
                      </div>
                      <div className="bg-yellow-600/20 rounded-lg p-2 text-center">
                        <p className="text-yellow-400">WATT/block</p>
                        <p className="font-bold">{component.wattUsage}</p>
                      </div>
                      <div className="bg-blue-600/20 rounded-lg p-2 text-center">
                        <p className="text-blue-400">Stake Weight</p>
                        <p className="font-bold">{component.stakeWeight}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mining Rig Builder */}
          <div>
            <div className={`${cardClass} rounded-2xl p-6 mb-6`}>
              <h2 className="text-2xl font-bold mb-6">Your Mining Rig</h2>
              
              {selectedComponents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select components to build your rig</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedComponents.map((component) => (
                    <div
                      key={component.id}
                      className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-xl p-4 border`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={component.image}
                            alt={component.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-semibold">{component.name}</p>
                            <p className="text-xs text-gray-400">{component.brand}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeComponent(component.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className={`${cardClass} rounded-2xl p-6 mb-6`}>
              <h3 className="text-xl font-bold mb-4">Rig Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Hashpower:</span>
                  <span className="font-bold text-purple-400">{stats.totalHashpower}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">WATT Usage/block:</span>
                  <span className="font-bold text-yellow-400">{stats.totalWattUsage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Stake Weight:</span>
                  <span className="font-bold text-blue-400">{stats.totalStakeWeight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Components:</span>
                  <span className="font-bold">{selectedComponents.length}</span>
                </div>
              </div>
            </div>

            {/* Build Button */}
            <button
              onClick={buildMiningRig}
              disabled={selectedComponents.length === 0 || isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-semibold text-lg transition-all"
            >
              {isLoading ? 'Building Rig...' : 'Build Mining Rig'}
            </button>

            {/* Network Info */}
            <div className={`mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-xl p-4 border`}>
              <h4 className="font-semibold mb-2">Network Information</h4>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Chain ID:</span>
                  <span>{currentNetwork.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span>NFT Contract:</span>
                  <span className="font-mono">{currentNetwork.nftContract.slice(0, 10)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>WATT Contract:</span>
                  <span className="font-mono">{currentNetwork.wattContract.slice(0, 10)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiningRigBuilder;