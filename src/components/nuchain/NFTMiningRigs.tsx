import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Cpu, HardDrive, Award, Settings, Plus, Zap, Power } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NFTComponent {
  id: string;
  name: string;
  type: string;
  contract: string;
  rarity: string;
  hashRateBonus: string;
  powerConsumption: string;
  slots?: number;
  cores?: number;
  vram?: string;
  special?: string;
  icon: any;
}

interface ConfiguredRig {
  id: string;
  name: string;
  components: Array<{
    type: string;
    name: string;
  }>;
  totalHashRate: string;
  powerConsumption: string;
  efficiency: string;
  status: string;
  pool: string | null;
  earnings: string;
}

const NFTMiningRigs: React.FC = () => {
  const [selectedRig, setSelectedRig] = useState<string>('');

  // NFT Contract addresses on Polygon (from WATTxchange repository)
  const nftContracts = {
    // Altcoinchain Mining Game contracts
    pcCase: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2/1',
    xl1Processor: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2/3',
    tx120Gpu: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2/4',
    gp50Gpu: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2/5',
    genesisBadge: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2/2'
  };

  const myNFTs: NFTComponent[] = [
    {
      id: 'pc-case-1',
      name: 'Free Mint PC Case',
      type: 'PC Case',
      contract: nftContracts.pcCase,
      rarity: 'Common',
      hashRateBonus: '0%',
      powerConsumption: '0W',
      slots: 4,
      icon: Monitor
    },
    {
      id: 'xl1-proc-1',
      name: 'XL1 Processor',
      type: 'Processor',
      contract: nftContracts.xl1Processor,
      rarity: 'Rare',
      hashRateBonus: '+25%',
      powerConsumption: '125W',
      cores: 8,
      icon: Cpu
    },
    {
      id: 'tx120-gpu-1',
      name: 'TX120 GPU',
      type: 'Graphics Card',
      contract: nftContracts.tx120Gpu,
      rarity: 'Epic',
      hashRateBonus: '+150%',
      powerConsumption: '320W',
      vram: '12GB',
      icon: HardDrive
    },
    {
      id: 'gp50-gpu-1',
      name: 'GP50 GPU',
      type: 'Graphics Card',
      contract: nftContracts.gp50Gpu,
      rarity: 'Legendary',
      hashRateBonus: '+200%',
      powerConsumption: '450W',
      vram: '24GB',
      icon: HardDrive
    },
    {
      id: 'genesis-badge-1',
      name: 'Genesis Badge',
      type: 'Boost Item',
      contract: nftContracts.genesisBadge,
      rarity: 'Mythic',
      hashRateBonus: '+50% Overclock',
      powerConsumption: '+25%',
      special: 'Overclocks all components',
      icon: Award
    }
  ];

  const configuredRigs: ConfiguredRig[] = [
    {
      id: 'rig-alpha',
      name: 'Alpha Mining Rig',
      components: [
        { type: 'PC Case', name: 'Free Mint PC Case' },
        { type: 'Processor', name: 'XL1 Processor' },
        { type: 'Graphics Card', name: 'TX120 GPU' },
        { type: 'Boost Item', name: 'Genesis Badge' }
      ],
      totalHashRate: '187.5 MH/s',
      powerConsumption: '612W',
      efficiency: '0.31 MH/W',
      status: 'mining',
      pool: 'Beta Mining Pool',
      earnings: '2.47 WATT/day'
    },
    {
      id: 'rig-beta',
      name: 'Beta Mining Rig',
      components: [
        { type: 'PC Case', name: 'Free Mint PC Case' },
        { type: 'Processor', name: 'XL1 Processor' },
        { type: 'Graphics Card', name: 'GP50 GPU' }
      ],
      totalHashRate: '225 MH/s',
      powerConsumption: '575W',
      efficiency: '0.39 MH/W',
      status: 'idle',
      pool: null,
      earnings: '0 WATT/day'
    }
  ];

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

  const handleConfigureRig = () => {
    toast.success('Rig configuration interface opened');
  };

  const handleStartMining = (rigId: string) => {
    toast.success(`Starting mining with ${rigId}`);
  };

  const handleStopMining = (rigId: string) => {
    toast.success(`Stopping mining with ${rigId}`);
  };

  return (
    <div className="space-y-6">
      {/* NFT Collection */}
      <div>
        <h3 className="text-xl font-semibold mb-4">My Mining Hardware NFTs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myNFTs.map((nft, index) => {
            const Icon = nft.icon;
            return (
              <motion.div
                key={nft.id}
                className={`relative bg-slate-800/30 backdrop-blur-xl rounded-xl p-6 border transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                {/* Rarity Gradient Border */}
                <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(nft.rarity)} rounded-xl p-[1px]`}>
                  <div className="bg-slate-800/90 rounded-xl h-full w-full" />
                </div>

                <div className="relative z-10 p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-6 h-6 text-blue-400" />
                      <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">
                        {nft.type}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${getRarityColor(nft.rarity)} bg-clip-text text-transparent`}>
                      {nft.rarity}
                    </span>
                  </div>

                  {/* NFT Info */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">{nft.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hash Rate:</span>
                        <span className="font-medium text-emerald-400">{nft.hashRateBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Power:</span>
                        <span className="font-medium text-yellow-400">{nft.powerConsumption}</span>
                      </div>
                      {nft.slots && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Slots:</span>
                          <span className="font-medium">{nft.slots}</span>
                        </div>
                      )}
                      {nft.cores && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Cores:</span>
                          <span className="font-medium">{nft.cores}</span>
                        </div>
                      )}
                      {nft.vram && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">VRAM:</span>
                          <span className="font-medium">{nft.vram}</span>
                        </div>
                      )}
                      {nft.special && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Special:</span>
                          <span className="font-medium text-purple-400">{nft.special}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t border-slate-700/30">
                      <p className="text-xs text-slate-400 font-mono">{nft.contract}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Rig Configuration */}
      <motion.div
        className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Configure Mining Rig</h3>
              <p className="text-slate-400">Combine your NFTs to create powerful mining rigs</p>
            </div>
          </div>
          
          <motion.button
            onClick={handleConfigureRig}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            <span>New Rig</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 text-blue-400">Rig Components</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-slate-400" />
                <span>1x PC Case NFT (Required)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>1x Processor NFT (Required)</span>
              </div>
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span>1-2x GPU NFTs (Optional)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>1x Genesis Badge (Boost)</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 text-blue-400">Genesis Badge Effects</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Hash Rate Boost:</span>
                <span className="font-medium text-emerald-400">+50%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Power Increase:</span>
                <span className="font-medium text-yellow-400">+25%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WATT Efficiency:</span>
                <span className="font-medium text-purple-400">+20%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Overclock Mode:</span>
                <span className="font-medium text-blue-400">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Configured Rigs */}
      <div>
        <h3 className="text-xl font-semibold mb-4">My Mining Rigs</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configuredRigs.map((rig, index) => (
            <motion.div
              key={rig.id}
              className={`bg-slate-800/30 backdrop-blur-xl rounded-xl p-6 border transition-all duration-300 ${
                selectedRig === rig.id
                  ? 'border-purple-500/50 bg-purple-500/5'
                  : 'border-slate-700/50 hover:border-slate-600/50'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedRig(rig.id)}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Monitor className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{rig.name}</h4>
                    <p className="text-sm text-slate-400">{rig.totalHashRate}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  rig.status === 'mining'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {rig.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Components</p>
                  <div className="space-y-1">
                    {rig.components.map((component, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{component.name}</span>
                        <span className="text-xs bg-slate-700/50 px-2 py-1 rounded">
                          {component.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Power Usage</p>
                    <p className="font-medium text-yellow-400">{rig.powerConsumption}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Efficiency</p>
                    <p className="font-medium text-blue-400">{rig.efficiency}</p>
                  </div>
                </div>

                {rig.pool && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Pool:</span>
                    <span className="font-medium">{rig.pool}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Earnings:</span>
                  <span className="font-medium text-emerald-400">{rig.earnings}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                {rig.status === 'mining' ? (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopMining(rig.id);
                    }}
                    className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors border border-red-500/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Stop Mining
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartMining(rig.id);
                    }}
                    className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg text-sm font-medium transition-colors border border-emerald-500/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Start Mining
                  </motion.button>
                )}
                <motion.button
                  className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Configure
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mining Statistics */}
      <motion.div
        className="bg-slate-800/30 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-xl font-semibold mb-4">NFT Mining Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">5</p>
            <p className="text-slate-400 text-sm">Owned NFTs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">2</p>
            <p className="text-slate-400 text-sm">Active Rigs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">187.5 MH/s</p>
            <p className="text-slate-400 text-sm">Total Hash Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">2.47 WATT</p>
            <p className="text-slate-400 text-sm">Daily Earnings</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NFTMiningRigs;