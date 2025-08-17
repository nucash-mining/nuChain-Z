import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Zap, 
  HardDrive, 
  Monitor, 
  Settings, 
  Power, 
  Award,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Moon,
  Sun,
  Gamepad2,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Wallet,
  Activity,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThreeDViewer from './ThreeDViewer';

interface NFTComponent {
  tokenId: number;
  name: string;
  type: string;
  rarity: string;
  hashPower: number;
  wattConsumption: number;
  image: string;
  glbModel: string;
  owned: boolean;
  quantity: number;
}

interface MiningGameLog {
  id: number;
  timestamp: Date;
  action: string;
  details: string;
  txHash?: string;
}

interface WalletBalance {
  watt: number;
  chain: 'altcoinchain' | 'polygon';
  address: string;
}

const MiningRigBuilder: React.FC = () => {
  const [nftComponents, setNftComponents] = useState<NFTComponent[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [miningGameLog, setMiningGameLog] = useState<MiningGameLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'nfts' | 'wallet' | 'logs' | 'builder'>('nfts');
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeMiningGameData();
    loadWalletBalances();
    loadMiningGameLogs();
  }, []);

  const initializeMiningGameData = () => {
    // Real Mining Game NFT components from Altcoinchain and Polygon
    const components: NFTComponent[] = [
      {
        tokenId: 1,
        name: 'Free Mint Gaming PC',
        type: 'PC Case',
        rarity: 'Common',
        hashPower: 0,
        wattConsumption: 0,
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/pc-case.glb',
        owned: true,
        quantity: 3
      },
      {
        tokenId: 2,
        name: 'Genesis Badge',
        type: 'Multiplier',
        rarity: 'Mythic',
        hashPower: 0,
        wattConsumption: 0,
        image: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg',
        glbModel: '/models/genesis-badge.glb',
        owned: true,
        quantity: 1
      },
      {
        tokenId: 3,
        name: 'XL1 Processor',
        type: 'CPU',
        rarity: 'Rare',
        hashPower: 500000,
        wattConsumption: 125,
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/xl1-processor.glb',
        owned: true,
        quantity: 2
      },
      {
        tokenId: 4,
        name: 'TX120 GPU',
        type: 'Graphics Card',
        rarity: 'Epic',
        hashPower: 1500000,
        wattConsumption: 320,
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/tx120-gpu.glb',
        owned: true,
        quantity: 1
      },
      {
        tokenId: 5,
        name: 'GP50 GPU',
        type: 'Graphics Card',
        rarity: 'Legendary',
        hashPower: 2000000,
        wattConsumption: 450,
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/gp50-gpu.glb',
        owned: false,
        quantity: 0
      }
    ];

    setNftComponents(components);
  };

  const loadWalletBalances = () => {
    // Mock wallet balances - replace with actual Web3 calls
    const balances: WalletBalance[] = [
      {
        watt: 25000,
        chain: 'altcoinchain',
        address: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b4c8e8'
      },
      {
        watt: 15000,
        chain: 'polygon',
        address: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b4c8e8'
      }
    ];

    setWalletBalances(balances);
  };

  const loadMiningGameLogs = () => {
    // Mock mining game activity logs
    const logs: MiningGameLog[] = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 300000),
        action: 'NFT Minted',
        details: 'Minted XL1 Processor (Token ID: 3)',
        txHash: '0x1234...abcd'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 600000),
        action: 'WATT Earned',
        details: 'Earned 150 WATT from mining rewards',
        txHash: '0x5678...efgh'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 900000),
        action: 'Mining Rig Powered On',
        details: 'Activated mining rig #1 on nuChain',
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 1200000),
        action: 'Pool Joined',
        details: 'Joined Elite Mining Pool with 2.5% fee',
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 1800000),
        action: 'Component Staked',
        details: 'Staked GP50 GPU for WATT rewards',
        txHash: '0x9abc...def0'
      }
    ];

    setMiningGameLog(logs);
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      Common: 'border-gray-400 bg-gray-400/10 text-gray-400',
      Uncommon: 'border-green-400 bg-green-400/10 text-green-400',
      Rare: 'border-blue-400 bg-blue-400/10 text-blue-400',
      Epic: 'border-purple-400 bg-purple-400/10 text-purple-400',
      Legendary: 'border-yellow-400 bg-yellow-400/10 text-yellow-400',
      Mythic: 'border-red-400 bg-red-400/10 text-red-400'
    };
    return colors[rarity as keyof typeof colors] || colors.Common;
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsConnected(true);
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('Please install MetaMask to connect your wallet');
      }
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
  };

  const toggleNFTSelection = (tokenId: number) => {
    setSelectedNFTs(prev => 
      prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const cardClass = isDarkMode 
    ? 'bg-gray-800/50 border-gray-600' 
    : 'bg-white/10 border-white/20';

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Gamepad2 className={`w-12 h-12 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mining Game Dashboard
            </h1>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage your Mining Game NFTs and WATT tokens
          </p>
        </div>

        {/* Wallet Connection */}
        {!isConnected && (
          <div className="text-center mb-8">
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105"
            >
              <Wallet className="w-5 h-5 inline mr-2" />
              Connect Wallet
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className={`flex rounded-xl p-1 ${cardClass} border backdrop-blur-lg`}>
            {[
              { id: 'nfts', label: 'My NFTs', icon: Award },
              { id: 'wallet', label: 'WATT Balance', icon: Wallet },
              { id: 'logs', label: 'Activity Log', icon: Activity },
              { id: 'builder', label: 'Rig Builder', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* My NFTs Tab */}
        {activeTab === 'nfts' && (
          <div>
            <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg mb-6`}>
              <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                My Mining Game NFTs
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {nftComponents.map((nft) => (
                  <motion.div
                    key={nft.tokenId}
                    whileHover={{ scale: 1.02 }}
                    className={`${getRarityColor(nft.rarity)} rounded-xl p-4 border-2 cursor-pointer transition-all ${
                      selectedNFTs.includes(nft.tokenId) ? 'ring-2 ring-purple-500' : ''
                    } ${!nft.owned ? 'opacity-50' : ''}`}
                    onClick={() => nft.owned && toggleNFTSelection(nft.tokenId)}
                  >
                    <div className="text-center mb-3">
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-bold mb-2 ${getRarityColor(nft.rarity)}`}>
                        {nft.rarity}
                      </div>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {nft.name}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {nft.type} • Token ID: {nft.tokenId}
                      </p>
                    </div>

                    <ThreeDViewer
                      modelUrl={nft.glbModel}
                      fallbackImage={nft.image}
                      className="w-full h-32 mb-4"
                      zoomLevel={1.5}
                    />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Hash Power:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {nft.hashPower.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>WATT Cost:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          {nft.wattConsumption}/block
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Owned:</span>
                        <span className={`font-bold ${nft.owned ? 'text-green-400' : 'text-red-400'}`}>
                          {nft.owned ? `${nft.quantity}x` : 'Not Owned'}
                        </span>
                      </div>
                    </div>

                    {nft.owned && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <button
                          className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                            selectedNFTs.includes(nft.tokenId)
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          {selectedNFTs.includes(nft.tokenId) ? 'Deselect' : 'Select for Rig'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WATT Balance Tab */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {walletBalances.map((balance, index) => (
              <div key={index} className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
                <div className="text-center mb-6">
                  <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {balance.chain === 'altcoinchain' ? 'Altcoinchain' : 'Polygon'} Wallet
                  </h2>
                  <p className={`text-sm font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {balance.address}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <div className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {balance.watt.toLocaleString()}
                  </div>
                  <div className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    WATT Tokens
                  </div>
                </div>

                <div className="space-y-3">
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
                    <DollarSign className="w-5 h-5 inline mr-2" />
                    Stake WATT
                  </button>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all">
                    <TrendingUp className="w-5 h-5 inline mr-2" />
                    View on Explorer
                  </button>
                </div>

                <div className={`mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-xl p-4 border`}>
                  <h4 className="font-semibold mb-2">Network Info</h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Chain ID:</span>
                      <span>{balance.chain === 'altcoinchain' ? '2330' : '137'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contract:</span>
                      <span className="font-mono">
                        {balance.chain === 'altcoinchain' 
                          ? '0x6645...4698' 
                          : '0xE960...5839'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'logs' && (
          <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mining Game Activity Log
            </h2>
            
            <div className="space-y-4">
              {miningGameLog.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-xl p-4 border`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {log.action}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        {log.details}
                      </p>
                      {log.txHash && (
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Tx Hash:
                          </span>
                          <span className={`text-xs font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {log.txHash}
                          </span>
                          <button className="text-xs text-purple-400 hover:text-purple-300">
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Rig Builder Tab */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
                <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Build Mining Rig
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nftComponents.filter(nft => nft.owned).map((nft) => (
                    <div
                      key={nft.tokenId}
                      className={`${getRarityColor(nft.rarity)} rounded-xl p-4 border-2 cursor-pointer transition-all ${
                        selectedNFTs.includes(nft.tokenId) ? 'ring-2 ring-purple-500' : ''
                      }`}
                      onClick={() => toggleNFTSelection(nft.tokenId)}
                    >
                      <h3 className={`font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {nft.name}
                      </h3>
                      <ThreeDViewer
                        modelUrl={nft.glbModel}
                        fallbackImage={nft.image}
                        className="w-full h-24 mb-3"
                      />
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Hash Power:</span>
                          <span className="font-bold">{nft.hashPower.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WATT Cost:</span>
                          <span className="font-bold">{nft.wattConsumption}/block</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Selected Components
                </h3>
                
                {selectedNFTs.length === 0 ? (
                  <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Select NFT components to build your rig
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedNFTs.map(tokenId => {
                      const nft = nftComponents.find(n => n.tokenId === tokenId);
                      return nft ? (
                        <div key={tokenId} className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-lg p-3 border`}>
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {nft.name}
                            </span>
                            <button
                              onClick={() => toggleNFTSelection(tokenId)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })}
                    
                    <div className="mt-6 pt-4 border-t border-gray-600">
                      <button
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
                        onClick={() => {
                          toast.success('Mining rig created successfully!');
                          setSelectedNFTs([]);
                        }}
                      >
                        <Save className="w-5 h-5 inline mr-2" />
                        Create Mining Rig
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiningRigBuilder;