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
    nftContract: '0x0000000000000000000000000000000000000000', // Update with deployed MockERC1155 address
    wattContract: '0x0000000000000000000000000000000000000000', // Update with deployed MockERC20 address
    stakingContract: '0x0000000000000000000000000000000000000000', // Update with deployed MiningPoolOperator address
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
  const [activeTab, setActiveTab] = useState<'build' | 'stake-nfts' | 'mining-pools' | 'stake-watt'>('build');
  const [account, setAccount] = useState<string>('');
  const [wattBalance, setWattBalance] = useState<string>('0');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<Component[]>([]);
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [gpuCount, setGpuCount] = useState<{tx120: number, gp50: number}>({tx120: 0, gp50: 0});
  const [showContractModal, setShowContractModal] = useState(false);
  const [rigConfiguration, setRigConfiguration] = useState({
    name: '',
  const [showFreeMintModal, setShowFreeMintModal] = useState(false);
    payoutAddress: '',
    wattAllowance: '',
    stakingAddress: ''
  });
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedRigForStaking, setSelectedRigForStaking] = useState<number | null>(null);
  const [savedRigs, setSavedRigs] = useState<any[]>([]);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [poolConfiguration, setPoolConfiguration] = useState({
    name: '',
    wattStake: '100000',
    feePercentage: '2.5',
    payoutAddress: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('altcoinchain');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPoolDeployment, setShowPoolDeployment] = useState(false);
  const [showNFTStaking, setShowNFTStaking] = useState(false);
  const [selectedStakingNFTs, setSelectedStakingNFTs] = useState<number[]>([]);
  const [stakingRewards, setStakingRewards] = useState<Record<number, number>>({});
  const [poolFormData, setPoolFormData] = useState({
    poolName: '',
    domainName: '',
    feePayoutAddress: '',
    feeRate: '0',
    logoImageUrl: '',
    developerDonation: '0'
  });

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
      loadStakingRewards();
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
    try {
      const network = NETWORKS[networkKey];
      
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
      }
      
      setSelectedNetwork(networkKey);
      toast.success(`Switched to ${network.name}`);
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to wallet
        try {
          const network = NETWORKS[networkKey];
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.name,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.blockExplorerUrls
            }],
          });
          setSelectedNetwork(networkKey);
          toast.success(`Added and switched to ${network.name}`);
        } catch (addError) {
          console.error('Error adding network:', addError);
          toast.error('Failed to add network');
        }
      } else {
        console.error('Error switching network:', error);
        toast.error('Failed to switch network');
      }
    }
  };

  const validateComponent = (component: Component) => {
    // Validate required components
    const hasCase = selectedComponents.some(c => c.id === 1) || component.id === 1;
    const hasCPU = selectedComponents.some(c => c.id === 3) || component.id === 3;
    
    if (!hasCase && component.id !== 1) {
      toast.error('You must add a PC Case first');
      return;
    }
    
    if (!hasCPU && component.id !== 1 && component.id !== 3) {
      toast.error('You must add an XL1 Processor before adding other components');
      return;
    }

    // GPU validation - allow max 2 GPUs total, max 1 TX120, max 2 GP50
    if (component.id === 4 || component.id === 5) {
      const currentTX120 = selectedComponents.filter(c => c.id === 4).length;
      const currentGP50 = selectedComponents.filter(c => c.id === 5).length;
      const totalGPUs = currentTX120 + currentGP50;
      
      if (totalGPUs >= 2) {
        toast.error('Maximum 2 Graphics Cards allowed per rig');
        return;
      }
      
      if (component.id === 4 && currentTX120 >= 1) {
        toast.error('Maximum 1 TX120 GPU allowed per rig');
        return;
      }
      
      if (component.id === 5 && currentGP50 >= 2) {
        toast.error('Maximum 2 GP50 GPUs allowed per rig');
        return;
      }
    }
  };

  const loadWattBalance = async () => {
    if (!isConnected || !account) return;

    try {
      const network = NETWORKS[selectedNetwork];
      
      // Check if contract address is properly configured
      if (network.wattContract === '0x0000000000000000000000000000000000000000') {
        console.warn(`WATT contract address not configured for ${network.name}`);
        setWattBalance('0');
        return;
      }
      
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
      console.warn('Error loading WATT balance:', error.message);
      setWattBalance('0');
    }
  };

  const loadNFTBalances = async () => {
    if (!isConnected || !account) return;

    try {
      const network = NETWORKS[selectedNetwork];
      
      // Check if contract addresses are properly configured
      if (network.nftContract === '0x0000000000000000000000000000000000000000') {
        console.warn(`NFT contract address not configured for ${network.name}`);
        // Set all balances to 0 for unconfigured networks
        const updatedComponents = availableComponents.map(component => ({
          ...component,
          balance: 0
        }));
        setAvailableComponents(updatedComponents);
        return;
      }
      
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
            console.warn(`Error loading balance for component ${component.id}:`, error.message);
            return { ...component, balance: 0 };
          }
        })
      );

      setAvailableComponents(updatedComponents);
    } catch (error) {
      console.warn('Error loading NFT balances:', error.message);
      // Set all balances to 0 on error
      const updatedComponents = availableComponents.map(component => ({
        ...component,
        balance: 0
      }));
      setAvailableComponents(updatedComponents);
    }
  };

  const loadStakingRewards = async () => {
    if (!isConnected || !account) return;

    try {
      const network = NETWORKS[selectedNetwork];
      if (network.stakingContract === '0x0000000000000000000000000000000000000000') {
        return;
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const stakingContract = new ethers.Contract(
        network.stakingContract,
        ['function pendingRewards(address, uint256) view returns (uint256)'],
        provider
      );

      const rewards: Record<number, number> = {};
      for (const component of availableComponents) {
        try {
          const pending = await stakingContract.pendingRewards(account, component.id);
          rewards[component.id] = parseFloat(ethers.utils.formatEther(pending));
        } catch (error) {
          rewards[component.id] = 0;
        }
      }
      setStakingRewards(rewards);
    } catch (error) {
      console.warn('Error loading staking rewards:', error);
    }
  };

  const stakeNFTs = async () => {
    if (selectedStakingNFTs.length === 0) {
      toast.error('Please select NFTs to stake');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate staking transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Staked ${selectedStakingNFTs.length} NFTs successfully!`);
      setSelectedStakingNFTs([]);
      loadStakingRewards();
    } catch (error) {
      console.error('Error staking NFTs:', error);
      toast.error('Failed to stake NFTs');
    } finally {
      setIsLoading(false);
    }
  };

  const claimRewards = async (componentId: number) => {
    setIsLoading(true);
    try {
      // Simulate claiming rewards
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const reward = stakingRewards[componentId] || 0;
      toast.success(`Claimed ${reward.toFixed(4)} WATT rewards!`);
      
      // Reset rewards for this component
      setStakingRewards(prev => ({ ...prev, [componentId]: 0 }));
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error('Failed to claim rewards');
    } finally {
      setIsLoading(false);
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
    // Validate required components
    const hasCase = selectedComponents.some(c => c.id === 1);
    const hasCPU = selectedComponents.some(c => c.id === 3);
    const hasGPU = selectedComponents.some(c => c.id === 4 || c.id === 5);

    if (!hasCase) {
      toast.error('PC Case is required');
      return;
    }

    if (!hasCPU) {
      toast.error('XL1 Processor is required');
      return;
    }

    if (!hasGPU) {
      toast.error('At least one Graphics Card is required');
      return;
    }

    // Show contract interaction modal
    setShowContractModal(true);
  };

  const handleContractSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate contract interaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const stats = calculateTotalStats();
      const newRig = {
        id: Date.now(),
        name: rigConfiguration.name,
        components: selectedComponents,
        totalHashpower: stats.totalHashpower,
        totalWattUsage: stats.totalWattUsage,
        totalStakeWeight: stats.totalStakeWeight,
        payoutAddress: rigConfiguration.payoutAddress,
        wattAllowance: rigConfiguration.wattAllowance,
        network: selectedNetwork,
        createdAt: new Date().toISOString()
      };
      
      setSavedRigs(prev => [...prev, newRig]);
      setSelectedComponents([]);
      setRigConfiguration({
        name: '',
        payoutAddress: '',
        wattAllowance: '',
        stakingAddress: ''
      });
      setShowContractModal(false);
      
      toast.success('Mining rig created successfully!');
    } catch (error) {
      console.error('Error creating mining rig:', error);
      toast.error('Failed to create mining rig');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStakeSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate staking transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('NFT mining rig staked successfully!');
      setShowStakeModal(false);
      setSelectedRigForStaking(null);
    } catch (error) {
      console.error('Error staking rig:', error);
      toast.error('Failed to stake mining rig');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePool = async () => {
    setIsLoading(true);
    try {
      // Simulate pool creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('Mining pool created successfully!');
      setShowPoolModal(false);
      setPoolConfiguration({
        name: '',
        wattStake: '100000',
        feePercentage: '2.5',
        payoutAddress: ''
      });
    } catch (error) {
      console.error('Error creating pool:', error);
      toast.error('Failed to create mining pool');
    } finally {
      setIsLoading(false);
    }
  };

  const deployMiningPool = async () => {
    setIsLoading(true);
    try {
      // Simulate pool deployment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('Mining pool deployed successfully!');
      setShowPoolDeployment(false);
      setPoolFormData({
        poolName: '',
        domainName: '',
        feePayoutAddress: '',
        feeRate: '0',
        logoImageUrl: '',
        developerDonation: '0'
      });
    } catch (error) {
      console.error('Error deploying mining pool:', error);
      toast.error('Failed to deploy mining pool');
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
          <div className="flex flex-wrap gap-4">
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
            
            {/* Action Buttons */}
            <button
              onClick={() => setShowNFTStaking(true)}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Stake Mining Game NFTs
            </button>
            
            {(selectedNetwork === 'altcoinchain' || selectedNetwork === 'polygon') && (
              <button
                onClick={() => setShowMiningPoolModal(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Deploy Mining Pool
              </button>
            )}
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
                {selectedNetwork === 'localhost' && currentNetwork.nftContract === '0x0000000000000000000000000000000000000000' && (
                  <div className="mt-2 p-2 bg-yellow-600/20 border border-yellow-600/30 rounded text-yellow-300">
                    <p className="text-xs">
                      <strong>Setup Required:</strong><br/>
                      1. Run: <code>npx hardhat run scripts/deploy.js --network localhost</code><br/>
                      2. Update contract addresses in the code with deployed addresses
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Configuration Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mining Rig Contract Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rig Name</label>
                <input
                  type="text"
                  value={rigConfiguration.name}
                  onChange={(e) => setRigConfiguration(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter rig name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">nuChain Payout Address</label>
                <input
                  type="text"
                  value={rigConfiguration.payoutAddress}
                  onChange={(e) => setRigConfiguration(prev => ({ ...prev, payoutAddress: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="nu1..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">WATT Allowance (per block)</label>
                <input
                  type="number"
                  value={rigConfiguration.wattAllowance}
                  onChange={(e) => setRigConfiguration(prev => ({ ...prev, wattAllowance: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1000"
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Contract Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold capitalize">{selectedNetwork}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract:</span>
                    <span className="font-mono text-xs">{currentNetwork.nftContract}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Components:</span>
                    <span className="font-semibold">{selectedComponents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hash Power:</span>
                    <span className="font-semibold text-purple-600">
                      {stats.totalHashpower}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">WATT/block:</span>
                    <span className="font-semibold text-yellow-600">
                      {stats.totalWattUsage}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowContractModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContractSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                >
                  {isLoading ? 'Creating...' : 'Create Mining Rig'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stake NFTs Modal */}
      {showStakeModal && selectedRigForStaking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Stake NFT Mining Rig</h2>
            
            {(() => {
              const rig = savedRigs.find(r => r.id === selectedRigForStaking);
              return rig ? (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">{rig.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hash Power:</span>
                        <span className="font-semibold">{rig.totalHashpower}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">WATT Consumption:</span>
                        <span className="font-semibold">{rig.totalWattUsage}/block</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Network:</span>
                        <span className="font-semibold capitalize">{rig.network}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Staking Contract:</span>
                        <span className="font-mono text-xs">{NETWORKS[rig.network].stakingContract}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> Staking will lock your NFT components and allow WATT consumption 
                      for mining operations. You can unstake at any time.
                    </p>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setShowStakeModal(false);
                        setSelectedRigForStaking(null);
                      }}
                      className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStakeSubmit}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                    >
                      Stake NFTs
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Create Mining Pool Modal */}
      {showPoolModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Mining Pool</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pool Name</label>
                <input
                  type="text"
                  value={poolConfiguration.name}
                  onChange={(e) => setPoolConfiguration(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter pool name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">WATT Stake Amount</label>
                <input
                  type="number"
                  value={poolConfiguration.wattStake}
                  onChange={(e) => setPoolConfiguration(prev => ({ ...prev, wattStake: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="100000"
                  min="100000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pool Fee (%)</label>
                <input
                  type="number"
                  value={poolConfiguration.feePercentage}
                  onChange={(e) => setPoolConfiguration(prev => ({ ...prev, feePercentage: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="2.5"
                  min="0"
                  max="10"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Payout Address</label>
                <input
                  type="text"
                  value={poolConfiguration.payoutAddress}
                  onChange={(e) => setPoolConfiguration(prev => ({ ...prev, payoutAddress: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0x..."
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Pool Operator Benefits</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• No WATT fees for your own mining operations</li>
                  <li>• Earn fees from all pool miners</li>
                  <li>• Configure pool settings and payouts</li>
                  <li>• Requires 100,000 WATT stake (refundable)</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Contract Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold capitalize">{selectedNetwork}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pool Contract:</span>
                    <span className="font-mono text-xs">{currentNetwork.stakingContract}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Required Stake:</span>
                    <span className="font-semibold text-green-600">100,000 WATT</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowPoolModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePool}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-6 py-3 rounded-lg font-semibold text-white transition-all"
                >
                  Create Pool
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NFT Staking Modal */}
      <AnimatePresence>
        {showNFTStaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNFTStaking(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border border-green-500/30 rounded-2xl p-8 max-w-7xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <img 
                    src={WATT_LOGO} 
                    alt="WATT" 
                    className="w-8 h-8"
                  />
                  <div>
                    <h2 className="text-3xl font-bold text-white">NFT Staking</h2>
                    <p className="text-gray-400">Stake your Mining Game NFTs to earn WATT tokens</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNFTStaking(false)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex space-x-8 mb-8 border-b border-gray-700">
                <button className="text-green-400 border-b-2 border-green-400 pb-2 font-semibold">
                  Inventory
                </button>
                <button className="text-gray-400 hover:text-white pb-2 transition-colors">
                  NFT-staking
                </button>
                <button className="text-gray-400 hover:text-white pb-2 transition-colors">
                  Token-staking
                </button>
                <button className="text-gray-400 hover:text-white pb-2 transition-colors">
                  Multi-send
                </button>
              </div>

              {/* Inventory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {availableComponents.map((component) => {
                  const isSelected = selectedStakingNFTs.includes(component.id);
                  const dailyReward = stakingRewards[component.id] || 0;
                  
                  return (
                    <motion.div
                      key={component.id}
                      whileHover={{ scale: 1.02 }}
                      className={`bg-gray-900 border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-green-500/30 hover:border-green-500/50'
                      }`}
                      onClick={() => {
                        if (component.balance <= 0) {
                          toast.error('You don\'t own this NFT');
                          return;
                        }
                        
                        if (isSelected) {
                          setSelectedStakingNFTs(prev => prev.filter(id => id !== component.id));
                        } else {
                          setSelectedStakingNFTs(prev => [...prev, component.id]);
                        }
                      }}
                    >
                      {/* Refresh Button */}
                      <div className="flex justify-end mb-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            loadStakingRewards();
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                          </svg>
                        </button>
                      </div>

                      {/* 3D Model or Image */}
                      <div className="relative mb-4">
                        {component.animation_url?.endsWith('.glb') && [3, 4, 5].includes(component.id) ? (
                          <ThreeDViewer
                            modelUrl={component.animation_url}
                            fallbackImage={component.image}
                            className="w-full h-full"
                          />
                        ) : component.animation_url?.endsWith('.glb') ? (
                          <ThreeDViewer
                            modelUrl={component.animation_url}
                            fallbackImage={component.image_small}
                            className="w-full h-56"
                            zoomLevel={1}
                          />
                        ) : component.animation_url?.includes('.mp4') ? (
                          <video
                            src={component.animation_url}
                            autoPlay
                            loop
                            muted
                            className="w-full h-56 object-cover rounded-lg bg-gray-800"
                          />
                        ) : (
                          <img
                            src={component.image}
                            alt={component.name}
                            className="w-full h-56 object-cover rounded-lg bg-gray-800"
                          />
                        )}
                      </div>

                      {/* Component Name */}
                      <h3 className="text-white font-bold text-center mb-4 text-sm uppercase tracking-wider">
                        {component.name}
                      </h3>

                      {/* Balance Display */}
                      <div className="text-center mb-4">
                        <div className="text-gray-400 text-xs mb-1">BALANCE</div>
                        <div className="text-white font-bold text-lg">{component.balance}</div>
                      </div>

                      {/* Daily Rewards */}
                      <div className="bg-gray-800 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-400 text-xs mb-1">DAILY REWARD</div>
                            <div className="text-white font-bold">{dailyReward.toFixed(4)}</div>
                          </div>
                          <img 
                            src={WATT_LOGO} 
                            alt="WATT" 
                            className="w-10 h-10"
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="text-center">
                        {component.balance > 0 ? (
                          dailyReward > 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                claimRewards(component.id);
                              }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                            >
                              CLAIM
                            </button>
                          ) : (
                            <button
                              className={`w-full font-bold py-2 px-4 rounded-lg transition-all ${
                                isSelected
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {isSelected ? 'UNSTAKE' : 'STAKE'}
                            </button>
                          )
                        ) : (
                          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all">
                            BUY
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Staking Actions */}
              {selectedStakingNFTs.length > 0 && (
                <div className="mt-8 bg-gray-900 border border-green-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Selected NFTs for Staking ({selectedStakingNFTs.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedStakingNFTs.map(id => {
                      const component = availableComponents.find(c => c.id === id);
                      return (
                        <span key={id} className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                          {component?.name}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setSelectedStakingNFTs([])}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={stakeNFTs}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                      {isLoading ? 'Staking...' : `Stake ${selectedStakingNFTs.length} NFTs`}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mining Pool Deployment Modal */}
      <AnimatePresence>
        {showPoolDeployment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPoolDeployment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${cardClass} rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">Deploy Mining Pool</h2>
                <button
                  onClick={() => setShowPoolDeployment(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  <strong>Requirements:</strong> 100,000 WATT tokens will be locked for pool operation.
                  Pool operators don't pay WATT fees for mining on nuChain L2.
                </p>
              </div>

              <div className="space-y-6">
                {/* Pool Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mining Pool Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={poolFormData.poolName}
                    onChange={(e) => setPoolFormData({...poolFormData, poolName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                    placeholder="Enter pool name (will be coded into contract)"
                  />
                </div>

                {/* Domain Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pool Domain Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={poolFormData.domainName}
                    onChange={(e) => setPoolFormData({...poolFormData, domainName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                    placeholder="e.g., mypool.com"
                  />
                </div>

                {/* Fee Payout Address */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fee Payout Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={poolFormData.feePayoutAddress}
                    onChange={(e) => setPoolFormData({...poolFormData, feePayoutAddress: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                    placeholder="0x..."
                  />
                </div>

                {/* Fee Rate */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pool Fee Rate (0% preferred by users)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={poolFormData.feeRate}
                      onChange={(e) => setPoolFormData({...poolFormData, feeRate: e.target.value})}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                    />
                    <span className="text-gray-400">% (max 10%)</span>
                  </div>
                  {parseFloat(poolFormData.feeRate) === 0 && (
                    <p className="text-green-400 text-sm mt-1">✓ 0% fee - Most preferred by users!</p>
                  )}
                </div>

                {/* Pool Logo */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pool Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={poolFormData.logoImageUrl}
                    onChange={(e) => setPoolFormData({...poolFormData, logoImageUrl: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    This logo will be displayed next to your pool name in The Mining Game
                  </p>
                </div>

                {/* Developer Donation */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Developer Donation (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={poolFormData.developerDonation}
                    onChange={(e) => setPoolFormData({...poolFormData, developerDonation: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                    placeholder="0"
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    Optional donation to developer: 0xFE4813250e155D4b746c039C179Df5Fe11C3240E
                  </p>
                </div>

                {/* Cost Summary */}
                <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Cost Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Pool Stake (Required):</span>
                      <span className="font-bold">100,000 WATT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Developer Donation:</span>
                      <span className="font-bold">{poolFormData.developerDonation || '0'} WATT</span>
                    </div>
                    <div className="border-t border-purple-600/30 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>Total Cost:</span>
                        <span>{100000 + parseFloat(poolFormData.developerDonation || '0')} WATT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deploy Button */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPoolDeployment(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deployMiningPool}
                    disabled={isLoading || !poolFormData.poolName || !poolFormData.domainName || !poolFormData.feePayoutAddress}
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    {isLoading ? 'Deploying...' : 'Deploy Pool'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiningRigBuilder;