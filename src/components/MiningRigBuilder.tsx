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
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThreeDViewer from './ThreeDViewer';

interface Component {
  id: number;
  name: string;
  type: 'cpu' | 'gpu' | 'memory' | 'storage' | 'motherboard' | 'psu' | 'cooling' | 'case';
  hashPower: number;
  wattConsumption: number;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  image: string;
  glbModel: string;
  tokenId: number;
  contractAddress: string;
  owned: boolean;
}

interface MiningRig {
  id: number;
  name: string;
  components: Component[];
  totalHashPower: number;
  totalWattConsumption: number;
  genesisBadgeMultiplier: number;
  isPoweredOn: boolean;
  selectedPool: string;
  selectedChain: string;
}

const MiningRigBuilder: React.FC = () => {
  const [selectedComponents, setSelectedComponents] = useState<Component[]>([]);
  const [availableComponents, setAvailableComponents] = useState<Component[]>([]);
  const [miningRigs, setMiningRigs] = useState<MiningRig[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'builder' | 'rigs' | 'pools'>('builder');
  const [rigName, setRigName] = useState('');
  const [genesisBadgeId, setGenesisBadgeId] = useState<number>(0);
  const [selectedPool, setSelectedPool] = useState('');
  const [selectedChain, setSelectedChain] = useState('nuchain');

  useEffect(() => {
    initializeComponents();
  }, []);

  const initializeComponents = () => {
    const components: Component[] = [
      {
        id: 1,
        name: 'Free Mint PC Case',
        type: 'case',
        hashPower: 0,
        wattConsumption: 0,
        price: 0,
        rarity: 'common',
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/pc-case.glb',
        tokenId: 1,
        contractAddress: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
        owned: true
      },
      {
        id: 2,
        name: 'Genesis Badge',
        type: 'case',
        hashPower: 0,
        wattConsumption: 0,
        price: 0,
        rarity: 'mythic',
        image: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg',
        glbModel: '/models/genesis-badge.glb',
        tokenId: 2,
        contractAddress: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
        owned: true
      },
      {
        id: 3,
        name: 'XL1 Processor',
        type: 'cpu',
        hashPower: 500000,
        wattConsumption: 125,
        price: 299,
        rarity: 'rare',
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/xl1-processor.glb',
        tokenId: 3,
        contractAddress: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
        owned: true
      },
      {
        id: 4,
        name: 'TX120 GPU',
        type: 'gpu',
        hashPower: 1500000,
        wattConsumption: 320,
        price: 799,
        rarity: 'epic',
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/tx120-gpu.glb',
        tokenId: 4,
        contractAddress: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
        owned: true
      },
      {
        id: 5,
        name: 'GP50 GPU',
        type: 'gpu',
        hashPower: 2000000,
        wattConsumption: 450,
        price: 1299,
        rarity: 'legendary',
        image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg',
        glbModel: '/models/gp50-gpu.glb',
        tokenId: 5,
        contractAddress: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
        owned: true
      }
    ];

    setAvailableComponents(components);
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'border-gray-400 bg-gray-400/10',
      uncommon: 'border-green-400 bg-green-400/10',
      rare: 'border-blue-400 bg-blue-400/10',
      epic: 'border-purple-400 bg-purple-400/10',
      legendary: 'border-yellow-400 bg-yellow-400/10',
      mythic: 'border-red-400 bg-red-400/10'
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      cpu: Cpu,
      gpu: Monitor,
      memory: HardDrive,
      storage: HardDrive,
      motherboard: Settings,
      psu: Power,
      cooling: RotateCcw,
      case: Settings
    };
    const IconComponent = icons[type as keyof typeof icons] || Settings;
    return <IconComponent className="w-5 h-5" />;
  };

  const addComponent = (component: Component) => {
    const hasCase = selectedComponents.some(c => c.type === 'case');
    const hasCPU = selectedComponents.some(c => c.type === 'cpu');
    const gpuCount = selectedComponents.filter(c => c.type === 'gpu').length;

    if (component.type === 'case' && hasCase) {
      toast.error('Only one case allowed per rig');
      return;
    }

    if (component.type === 'cpu' && hasCPU) {
      toast.error('Only one CPU allowed per rig');
      return;
    }

    if (component.type === 'gpu' && gpuCount >= 2) {
      toast.error('Maximum 2 GPUs allowed per rig');
      return;
    }

    setSelectedComponents([...selectedComponents, component]);
    toast.success(`Added ${component.name} to rig`);
  };

  const removeComponent = (componentId: number) => {
    setSelectedComponents(selectedComponents.filter(c => c.id !== componentId));
    toast.success('Component removed from rig');
  };

  const calculateTotalStats = () => {
    const totalHashPower = selectedComponents.reduce((sum, c) => sum + c.hashPower, 0);
    const totalWattConsumption = selectedComponents.reduce((sum, c) => sum + c.wattConsumption, 0);
    
    // Apply Genesis Badge multiplier if selected
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

  const createMiningRig = () => {
    if (selectedComponents.length === 0) {
      toast.error('Please add components to create a rig');
      return;
    }

    if (!rigName.trim()) {
      toast.error('Please enter a rig name');
      return;
    }

    const hasRequiredComponents = 
      selectedComponents.some(c => c.tokenId === 1) && // PC Case
      selectedComponents.some(c => c.tokenId === 3);   // XL1 Processor

    if (!hasRequiredComponents) {
      toast.error('PC Case and XL1 Processor are required');
      return;
    }

    const { totalHashPower, totalWattConsumption } = calculateTotalStats();

    const newRig: MiningRig = {
      id: Date.now(),
      name: rigName,
      components: [...selectedComponents],
      totalHashPower,
      totalWattConsumption,
      genesisBadgeMultiplier: genesisBadgeId > 0 ? getGenesisBadgeMultiplier(genesisBadgeId) : 100,
      isPoweredOn: false,
      selectedPool,
      selectedChain
    };

    setMiningRigs([...miningRigs, newRig]);
    setSelectedComponents([]);
    setRigName('');
    setGenesisBadgeId(0);
    setActiveTab('rigs');
    
    toast.success('Mining rig created successfully!');
  };

  const toggleRigPower = (rigId: number) => {
    setMiningRigs(rigs => 
      rigs.map(rig => 
        rig.id === rigId 
          ? { ...rig, isPoweredOn: !rig.isPoweredOn }
          : rig
      )
    );
    
    const rig = miningRigs.find(r => r.id === rigId);
    toast.success(`Mining rig ${rig?.isPoweredOn ? 'powered off' : 'powered on'}`);
  };

  const { totalHashPower, totalWattConsumption } = calculateTotalStats();

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
              NFT Mining Rig Builder
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
            Build your mining rig using Mining Game NFT components
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className={`flex rounded-xl p-1 ${cardClass} border backdrop-blur-lg`}>
            {[
              { id: 'builder', label: 'Rig Builder', icon: Settings },
              { id: 'rigs', label: 'My Rigs', icon: Monitor },
              { id: 'pools', label: 'Mining Pools', icon: Users }
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

        {/* Builder Tab */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Available Components */}
            <div className="lg:col-span-2">
              <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
                <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Available Components
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableComponents.map((component) => {
                    const isSelected = selectedComponents.some(c => c.id === component.id);
                    
                    return (
                      <motion.div
                        key={component.id}
                        whileHover={{ scale: 1.02 }}
                        className={`${getRarityColor(component.rarity)} rounded-xl p-4 border-2 cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-purple-500' : ''
                        }`}
                        onClick={() => isSelected ? removeComponent(component.id) : addComponent(component)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {getTypeIcon(component.type)}
                            <div>
                              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {component.name}
                              </h3>
                              <p className={`text-sm capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {component.rarity} {component.type}
                              </p>
                            </div>
                          </div>
                          <button className={`p-2 rounded-lg transition-all ${
                            isSelected 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}>
                            {isSelected ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>

                        <ThreeDViewer
                          modelUrl={component.glbModel}
                          fallbackImage={component.image}
                          className="w-full h-32 mb-3"
                          zoomLevel={1.5}
                        />

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Hash Power</p>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {component.hashPower.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>WATT Cost</p>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {component.wattConsumption}/block
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Token ID: {component.tokenId}
                            </span>
                            <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {component.owned ? 'Owned' : 'Not Owned'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rig Configuration */}
            <div>
              <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
                <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Rig Configuration
                </h2>

                {/* Selected Components */}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Selected Components ({selectedComponents.length})
                  </h3>
                  
                  {selectedComponents.length === 0 ? (
                    <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No components selected
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedComponents.map((component) => (
                        <div
                          key={component.id}
                          className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-xl p-4 border`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getTypeIcon(component.type)}
                              <div>
                                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {component.name}
                                </p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {component.hashPower.toLocaleString()} hash power
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeComponent(component.id)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                            >
                              <Minus className="w-4 h-4" />
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
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Hash Power:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {totalHashPower.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>WATT Cost/Block:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {totalWattConsumption}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Genesis Multiplier:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        {genesisBadgeId > 0 ? `${getGenesisBadgeMultiplier(genesisBadgeId)}%` : '100%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Configuration Form */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Rig Name
                    </label>
                    <input
                      type="text"
                      value={rigName}
                      onChange={(e) => setRigName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="Enter rig name"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Genesis Badge ID (Optional)
                    </label>
                    <input
                      type="number"
                      value={genesisBadgeId || ''}
                      onChange={(e) => setGenesisBadgeId(parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="Enter Genesis Badge ID"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Target Chain
                    </label>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="nuchain">nuChain L2</option>
                      <option value="zchain">zChain UTXO</option>
                    </select>
                  </div>

                  <button
                    onClick={createMiningRig}
                    disabled={selectedComponents.length === 0 || !rigName.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100"
                  >
                    <Save className="w-5 h-5 inline mr-2" />
                    Create Mining Rig
                  </button>
                </div>

                {/* Network Info */}
                <div className={`mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white/5 border-white/10'} rounded-xl p-4 border`}>
                  <h4 className="font-semibold mb-2">Network Information</h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>nuChain RPC:</span>
                      <span>http://localhost:26658</span>
                    </div>
                    <div className="flex justify-between">
                      <span>zChain RPC:</span>
                      <span>http://localhost:26657</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block Time:</span>
                      <span>0.5 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Rigs Tab */}
        {activeTab === 'rigs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {miningRigs.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Monitor className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No mining rigs created yet
                </p>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-all"
                >
                  Create Your First Rig
                </button>
              </div>
            ) : (
              miningRigs.map((rig) => (
                <motion.div
                  key={rig.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {rig.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        rig.isPoweredOn ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {rig.isPoweredOn ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Hash Power:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {rig.totalHashPower.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>WATT Cost:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {rig.totalWattConsumption}/block
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Components:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {rig.components.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Chain:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        {rig.selectedChain}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleRigPower(rig.id)}
                    className={`w-full font-bold py-3 px-4 rounded-lg transition-all ${
                      rig.isPoweredOn
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <Power className="w-5 h-5 inline mr-2" />
                    {rig.isPoweredOn ? 'Power Off' : 'Power On'}
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Mining Pools Tab */}
        {activeTab === 'pools' && (
          <div className={`${cardClass} rounded-2xl p-6 border backdrop-blur-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Mining Pools
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: 'Elite Mining Pool',
                  hashPower: 15000000,
                  miners: 42,
                  fee: 2.5,
                  url: 'https://elite-mining.netlify.app'
                },
                {
                  name: 'Pro Miners United',
                  hashPower: 12500000,
                  miners: 38,
                  fee: 3.0,
                  url: 'https://pro-miners.netlify.app'
                },
                {
                  name: 'Hardware Accelerated Pool',
                  hashPower: 18000000,
                  miners: 55,
                  fee: 2.0,
                  url: 'https://hardware-pool.netlify.app'
                }
              ].map((pool, index) => (
                <div
                  key={index}
                  className={`${cardClass} rounded-xl p-6 border backdrop-blur-lg hover:scale-105 transition-all cursor-pointer`}
                >
                  <h3 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {pool.name}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Hash Power:</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {pool.hashPower.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Miners:</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {pool.miners}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fee:</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {pool.fee}%
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedPool(pool.url);
                      toast.success(`Selected ${pool.name}`);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                  >
                    Join Pool
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiningRigBuilder;