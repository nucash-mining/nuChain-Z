import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Upload, Cpu, HardDrive, MemoryStick, Zap, Settings, Power, Plus, Trash2, Monitor, Award, Loader } from 'lucide-react';

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

const MINING_GAME_ABI = [
  "function uri(uint256 id) external view returns (string memory)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function _specs(uint256 id) external view returns (uint256)"
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
  metadata?: any;
  ipfsImage?: string;
  description?: string;
  attributes?: any[];
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
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [miningGameContract, setMiningGameContract] = useState<ethers.Contract | null>(null);

  // NFT Contract addresses from WATTxchange repository
  const getContractAddresses = (chainId: number) => {
    if (chainId === 31337) { // Localhost
      try {
        // Try to load deployment info for localhost
        const deploymentInfo = require('../../contracts/deployments/localhost-31337.json');
        return {
          nftContract: deploymentInfo.contracts.genesisBadge,
          wattToken: deploymentInfo.contracts.wattToken,
          wattTokenDisplay: deploymentInfo.contracts.wattToken,
          nftStaking: deploymentInfo.contracts.genesisBadge, // Use same for testing
          miningRigContract: deploymentInfo.contracts.nftMiningRig,
          miningPoolContract: deploymentInfo.contracts.miningPoolOperator,
          components: {
            pcCase: { contract: deploymentInfo.contracts.genesisBadge, tokenId: 1 },
            xl1Processor: { contract: deploymentInfo.contracts.genesisBadge, tokenId: 3 },
            tx120Gpu: { contract: deploymentInfo.contracts.genesisBadge, tokenId: 4 },
            gp50Gpu: { contract: deploymentInfo.contracts.genesisBadge, tokenId: 5 },
            genesisBadge: { contract: deploymentInfo.contracts.genesisBadge, tokenId: 2 }
          }
        };
      } catch (error) {
        console.warn('Could not load localhost deployment info, using fallback addresses');
        // Fallback for localhost when deployment file doesn't exist
        return {
          nftContract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default hardhat address
          wattToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          wattTokenDisplay: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          nftStaking: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          miningRigContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          miningPoolContract: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
          components: {
            pcCase: { contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', tokenId: 1 },
            xl1Processor: { contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', tokenId: 3 },
            tx120Gpu: { contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', tokenId: 4 },
            gp50Gpu: { contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', tokenId: 5 },
            genesisBadge: { contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3', tokenId: 2 }
          }
        };
      }
    }
    if (chainId === 2330) { // Altcoinchain
      return {
        nftContract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', // Mining Game NFTs
        wattToken: '0x6645143e49B3a15d8F205658903a55E520444698', // WATT token
        wattTokenDisplay: '0x6645143e49B3a15d8F205658903a55E520444698',
        nftStaking: '0xe463045318393095F11ed39f1a98332aBCc1A7b1', // NFT Staking contract
        miningRigContract: '0x...', // Will be deployed
        miningPoolContract: '0x...', // Will be deployed
        components: {
          pcCase: { contract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', tokenId: 4 },
          xl1Processor: { contract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', tokenId: 1 },
          tx120Gpu: { contract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', tokenId: 2 },
          gp50Gpu: { contract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', tokenId: 3 },
          genesisBadge: { contract: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2', tokenId: 2 }
        }
      };
    } else if (chainId === 137) { // Polygon
      return {
        nftContract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', // Mining Game NFTs on Polygon
        wattToken: '0xE960d5076cd3169C343Ee287A2c3380A222e5839', // WATT token on Polygon
        wattTokenDisplay: '0xE960d5076cd3169C343Ee287A2c3380A222e5839',
        nftStaking: '0x...', // Update with NFT Staking contract on Polygon
        miningRigContract: '0x...', // Will be deployed
        miningPoolContract: '0x...', // Will be deployed
        components: {
          pcCase: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 4 },
          xl1Processor: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 1 },
          tx120Gpu: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 2 },
          gp50Gpu: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 3 },
          genesisBadge: { contract: '0x970a8b10147e3459d3cbf56329b76ac18d329728', tokenId: 2 }
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
      loadAvailableComponentsWithMetadata();
    }
  }, [account, chainId]);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Create a temporary provider to get initial data
        const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await tempProvider.send('eth_requestAccounts', []);
        const network = await tempProvider.getNetwork();
        
        // Create provider with network config to prevent ENS errors
        const networkConfig = {
          chainId: network.chainId,
          name: network.chainId === 2330 ? 'altcoinchain' : network.chainId === 137 ? 'polygon' : 'unknown',
          ensAddress: null // Disable ENS to prevent UNSUPPORTED_OPERATION errors
        };
        
        const configuredProvider = new ethers.providers.Web3Provider(window.ethereum, networkConfig);
        
        setProvider(configuredProvider);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        
        const addresses = getContractAddresses(network.chainId);
        if (!addresses) {
          alert(`Unsupported network. Please switch to Polygon (137) or Altcoinchain (2330)`);
          return;
        }
        
        const signer = configuredProvider.getSigner();
        
        // Initialize Mining Game contract for metadata
        const gameContract = new ethers.Contract(
          addresses.nftContract,
          MINING_GAME_ABI,
          configuredProvider
        );
        setMiningGameContract(gameContract);
        
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

  const loadAvailableComponentsWithMetadata = async () => {
    if (!miningGameContract) return;
    
    setLoadingMetadata(true);
    
    const addresses = getContractAddresses(chainId);
    if (!addresses) return;

    // Mining Game NFT components with exact data
    const components: Component[] = [
      {
        id: 'pc-case-1',
        name: 'Free Mint PC Case',
        type: 'PC Case',
        contract: `${addresses.components.pcCase.contract}`,
        contractAddress: addresses.components.pcCase.contract,
        tokenId: addresses.components.pcCase.tokenId,
        rarity: 'Common',
        hashRateBonus: '0%',
        powerConsumption: '0W',
        hashPower: 0,
        wattConsumption: 0,
        slots: 4,
        glbFile: '/models/pc-case.glb',
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg'
      },
      {
        id: 'xl1-proc-1',
        name: 'XL1 Processor',
        type: 'Processor',
        contract: `${addresses.components.xl1Processor.contract}`,
        contractAddress: addresses.components.xl1Processor.contract,
        tokenId: addresses.components.xl1Processor.tokenId,
        rarity: 'Rare',
        hashRateBonus: '+25%',
        powerConsumption: '125W',
        hashPower: 500000,
        wattConsumption: 125,
        cores: 8,
        glbFile: '/models/xl1-processor.glb',
        image: 'https://images.pexels.com/photos/163100/circuit-circuit-board-resistor-computer-163100.jpeg'
      },
      {
        id: 'tx120-gpu-1',
        name: 'TX120 GPU',
        type: 'Graphics Card',
        contract: `${addresses.components.tx120Gpu.contract}`,
        contractAddress: addresses.components.tx120Gpu.contract,
        tokenId: addresses.components.tx120Gpu.tokenId,
        rarity: 'Epic',
        hashRateBonus: '+150%',
        powerConsumption: '320W',
        hashPower: 1500000,
        wattConsumption: 320,
        vram: '12GB',
        glbFile: '/models/tx120-gpu.glb',
        image: 'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg'
      },
      {
        id: 'gp50-gpu-1',
        name: 'GP50 GPU',
        type: 'Graphics Card',
        contract: `${addresses.components.gp50Gpu.contract}`,
        contractAddress: addresses.components.gp50Gpu.contract,
        tokenId: addresses.components.gp50Gpu.tokenId,
        rarity: 'Legendary',
        hashRateBonus: '+200%',
        powerConsumption: '450W',
        hashPower: 2000000,
        wattConsumption: 450,
        vram: '24GB',
        glbFile: '/models/gp50-gpu.glb',
        image: 'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg'
      },
      {
        id: 'genesis-badge-1',
        name: 'Genesis Badge',
        type: 'Boost Item',
        contract: `${addresses.components.genesisBadge.contract}`,
        contractAddress: addresses.components.genesisBadge.contract,
        tokenId: addresses.components.genesisBadge.tokenId,
        rarity: 'Mythic',
        hashRateBonus: '+50% Overclock',
        powerConsumption: '+25%',
        hashPower: 0,
        wattConsumption: 0,
        special: 'Overclocks all components',
        glbFile: '/models/genesis-badge.glb',
        image: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg'
      }
    ];
    
    // Load metadata for each component
    const componentsWithMetadata = await Promise.all(
      components.map(async (component) => {
        try {
          let metadataUri;
          let metadata;
          let ipfsImage;
          
          // Skip metadata fetch for localhost/mock contracts
          if (chainId === 31337) {
            metadata = { name: component.name, description: `Mock ${component.type}` };
            ipfsImage = component.image;
          } else {
            // Use direct IPFS links for real metadata
            const ipfsLinks = {
              1: 'https://ipfs.io/ipfs/bafybeic2timfsoxuq7nhtrajny6hanukrrcsau5vs4u3x77wxxpuew4eq4/1', // XL1 Processor
              2: 'https://ipfs.io/ipfs/bafybeic2timfsoxuq7nhtrajny6hanukrrcsau5vs4u3x77wxxpuew4eq4/2', // TX120 GPU
              3: 'https://ipfs.io/ipfs/bafybeic2timfsoxuq7nhtrajny6hanukrrcsau5vs4u3x77wxxpuew4eq4/3', // GP50 GPU
              4: 'https://ipfs.io/ipfs/bafybeic2timfsoxuq7nhtrajny6hanukrrcsau5vs4u3x77wxxpuew4eq4/4'  // PC Case
            };
            
            metadataUri = ipfsLinks[component.tokenId] || await miningGameContract.uri(component.tokenId);
            
            // Fetch metadata from IPFS
            const response = await fetch(metadataUri);
            metadata = await response.json();
            
            // Get image from metadata
            ipfsImage = metadata.image ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : component.image;
          }
          
          // Get component specs from contract (skip for localhost)
          let specs;
          if (chainId !== 31337) {
            try {
              specs = await miningGameContract._specs(component.tokenId);
            } catch (error) {
              console.warn(`Could not load specs for token ${component.tokenId}:`, error);
            }
          }
          
          return {
            ...component,
            metadata,
            ipfsImage,
            description: metadata.description || `${component.type} component for mining rigs`,
            attributes: metadata.attributes || [
              { trait_type: 'Type', value: component.type },
              { trait_type: 'Rarity', value: component.rarity }
            ],
            specs
          };
        } catch (error) {
          console.error(`Failed to load metadata for component ${component.tokenId}:`, error);
          return {
            ...component,
            metadata: { name: component.name, description: `${component.type} component` },
            ipfsImage: component.image,
            description: `${component.type} component for mining rigs`,
            attributes: [
              { trait_type: 'Type', value: component.type },
              { trait_type: 'Rarity', value: component.rarity }
            ]
          };
        }
      })
    );
    
    setAvailableComponents(componentsWithMetadata);
    setLoadingMetadata(false);
  };

  const loadUserData = async () => {
    if (!nftMiningRigContract || !account) return;
    
    try {
      setIsLoading(true);
      
      // Use sample configured rigs data for now (replace with contract calls when deployed)
      const sampleRigs: MiningRig[] = [
        {
          id: 1,
          name: 'Alpha Mining Rig',
          components: [
            { type: 'PC Case', name: 'Free Mint PC Case' },
            { type: 'Processor', name: 'XL1 Processor' },
            { type: 'Graphics Card', name: 'TX120 GPU' },
            { type: 'Boost Item', name: 'Genesis Badge' }
          ],
          totalHashPower: 1875000, // 187.5 MH/s in hash units
          totalWattConsumption: 612,
          genesisBadgeMultiplier: 150,
          isPoweredOn: true,
          efficiency: '0.31 MH/W',
          status: 'mining',
          pool: 'Beta Mining Pool',
          earnings: '2.47 WATT/day'
        },
        {
          id: 2,
          name: 'Beta Mining Rig',
          components: [
            { type: 'PC Case', name: 'Free Mint PC Case' },
            { type: 'Processor', name: 'XL1 Processor' },
            { type: 'Graphics Card', name: 'GP50 GPU' }
          ],
          totalHashPower: 2250000, // 225 MH/s in hash units
          totalWattConsumption: 575,
          genesisBadgeMultiplier: 100,
          isPoweredOn: false,
          efficiency: '0.39 MH/W',
          status: 'idle',
          pool: undefined,
          earnings: '0 WATT/day'
        }
      ];
      
      setUserRigs(sampleRigs);
      
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
    
    // GPU restrictions: max 1 TX120, max 1 GP50, max 2 total GPUs
    if (component.type === 'Graphics Card') {
      const existingGPUs = selectedComponents.filter(c => c.type === 'Graphics Card');
      
      if (existingGPUs.length >= 2) {
        alert('Maximum 2 Graphics Cards allowed per rig');
        return;
      }
      
      // Check for duplicate GPU types - only 1 of each allowed
      const existingTX120 = existingGPUs.find(c => c.name === 'TX120 GPU');
      const existingGP50 = existingGPUs.find(c => c.name === 'GP50 GPU');
      
      if (component.name === 'TX120 GPU' && existingTX120) {
        alert('Only one TX120 GPU allowed per rig');
        return;
      }
      
      if (component.name === 'GP50 GPU' && existingGP50) {
        alert('Only one GP50 GPU allowed per rig');
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
    const hasGPU = selectedComponents.some(c => c.type === 'Graphics Card');
    
    if (!hasCase || !hasProcessor || !hasGPU) {
      alert('Mining rig requires: 1 PC Case, 1 XL1 Processor, and at least 1 Graphics Card');
      return;
    }
    
    // Validate component requirements
    const caseComponents = selectedComponents.filter(c => c.type === 'PC Case');
    const processorComponents = selectedComponents.filter(c => c.type === 'Processor');
    const gpuComponents = selectedComponents.filter(c => c.type === 'Graphics Card');
    
    if (caseComponents.length !== 1) {
      alert('Exactly 1 PC Case required');
      return;
    }
    
    if (processorComponents.length !== 1) {
      alert('Exactly 1 XL1 Processor required');
      return;
    }
    
    if (gpuComponents.length === 0) {
      alert('At least 1 Graphics Card required (TX120 or GP50)');
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
                  onClick={() => switchNetwork(2330)}
                  className={`px-3 py-1 rounded text-xs ${chainId === 2330 ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                  Altcoinchain
                </button>
                <button
                  onClick={() => switchNetwork(137)}
                  className={`px-3 py-1 rounded text-xs ${chainId === 137 ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                  Polygon
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
                  
                  const isSelected = selectedComponents.some(c => c.id === component.id);
                  const canAdd = !isSelected && (
                    component.type !== 'PC Case' || !selectedComponents.some(c => c.type === 'PC Case')
                  ) && (
                    component.type !== 'Processor' || !selectedComponents.some(c => c.type === 'Processor')
                  ) && (
                    component.type !== 'Graphics Card' || selectedComponents.filter(c => c.type === 'Graphics Card').length < 2
                  ) && (
                    component.type !== 'Boost Item' || !selectedComponents.some(c => c.type === 'Boost Item')
                  );
                  
                  return (
                    <div
                      key={component.id}
                      className={`relative bg-white/5 rounded-xl p-4 border transition-all ${
                        canAdd ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'
                      } ${
                        isSelected
                          ? 'border-purple-400 bg-purple-400/10' 
                          : canAdd 
                            ? 'border-white/10 hover:border-purple-400'
                            : 'border-gray-600'
                      }`}
                      onClick={() => canAdd && addComponent(component)}
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
                        
                        <div className="w-full h-32 bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {loadingMetadata ? (
                            <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                          ) : component.ipfsImage ? (
                            <img 
                              src={component.ipfsImage} 
                              alt={component.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Icon className={`w-12 h-12 text-gray-600 ${component.ipfsImage ? 'hidden' : ''}`} />
                        </div>
                        
                        <h3 className="font-semibold mb-2">{component.name}</h3>
                        
                        {component.description && (
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{component.description}</p>
                        )}
                        
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
                          
                          {/* Display NFT attributes from metadata */}
                          {component.attributes && component.attributes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              {component.attributes.slice(0, 2).map((attr: any, index: number) => (
                                <div key={index} className="flex justify-between text-xs">
                                  <span className="text-gray-500">{attr.trait_type}:</span>
                                  <span>{attr.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-gray-700">
                          <p className="text-xs text-gray-500 font-mono">
                            Token ID: {component.tokenId}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {loadingMetadata && (
                  <div className="col-span-full text-center py-8">
                    <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
                    <p className="text-gray-400">Loading NFT metadata from IPFS...</p>
                  </div>
                )}
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
                        <div className="text-sm text-gray-400">
                          {component.type} • {component.rarity} • ID: {component.tokenId}
                        </div>
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
                
                {/* Component Requirements */}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2">Required Components:</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>• 1x PC Case (Free Mint)</span>
                      <span className={selectedComponents.some(c => c.type === 'PC Case') ? 'text-green-400' : 'text-red-400'}>
                        {selectedComponents.some(c => c.type === 'PC Case') ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• 1x XL1 Processor</span>
                      <span className={selectedComponents.some(c => c.type === 'Processor') ? 'text-green-400' : 'text-red-400'}>
                        {selectedComponents.some(c => c.type === 'Processor') ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• 1-2x GPU (max 1 of each type)</span>
                      <span className={selectedComponents.some(c => c.type === 'Graphics Card') ? 'text-green-400' : 'text-red-400'}>
                        {selectedComponents.filter(c => c.type === 'Graphics Card').length > 0 ? `✓ (${selectedComponents.filter(c => c.type === 'Graphics Card').length})` : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>• 1x Genesis Badge (Optional)</span>
                      <span className={selectedComponents.some(c => c.type === 'Boost Item') ? 'text-green-400' : 'text-yellow-400'}>
                        {selectedComponents.some(c => c.type === 'Boost Item') ? '✓' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>
                
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