import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Users, Zap, DollarSign, Settings, TrendingUp, Clock, Award } from 'lucide-react';

interface PoolStats {
  poolId: number;
  name: string;
  url: string;
  operator: string;
  feePercentage: number;
  totalHashPower: number;
  totalMiners: number;
  isActive: boolean;
}

interface MinerData {
  address: string;
  rigIds: number[];
  totalHashPower: number;
  totalWattConsumption: number;
  pendingRewards: number;
  isActive: boolean;
}

const MiningPoolDashboard: React.FC = () => {
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [miners, setMiners] = useState<MinerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [account, setAccount] = useState<string>('');
  
  // Pool management state
  const [selectedRigs, setSelectedRigs] = useState<number[]>([]);
  const [wattStakeAmount, setWattStakeAmount] = useState<string>('');
  const [showStaking, setShowStaking] = useState(false);

  useEffect(() => {
    initializePool();
  }, []);

  const initializePool = async () => {
    // Initialize Web3 and load pool data
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      
      // Load pool data from URL parameters or localStorage
      loadPoolData();
    }
  };

  const loadPoolData = () => {
    // Mock pool data - replace with actual contract calls
    const mockPoolStats: PoolStats = {
      poolId: 1,
      name: 'Elite Mining Pool',
      url: 'https://elite-mining.netlify.app',
      operator: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b4c8e8',
      feePercentage: 2.5,
      totalHashPower: 15000000,
      totalMiners: 42,
      isActive: true
    };

    const mockMiners: MinerData[] = [
      {
        address: '0x123...abc',
        rigIds: [1, 2],
        totalHashPower: 3500000,
        totalWattConsumption: 850,
        pendingRewards: 125.5,
        isActive: true
      },
      {
        address: '0x456...def',
        rigIds: [3],
        totalHashPower: 2100000,
        totalWattConsumption: 520,
        pendingRewards: 78.2,
        isActive: true
      },
      {
        address: '0x789...ghi',
        rigIds: [4, 5, 6],
        totalHashPower: 4200000,
        totalWattConsumption: 1050,
        pendingRewards: 156.8,
        isActive: true
      }
    ];

    setPoolStats(mockPoolStats);
    setMiners(mockMiners);
  };

  const joinPool = async () => {
    if (selectedRigs.length === 0) {
      alert('Please select at least one mining rig');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call mining pool contract to join
      // const tx = await miningPoolContract.joinPool(poolStats.poolId, selectedRigs);
      // await tx.wait();
      
      alert('Successfully joined the mining pool!');
      setSelectedRigs([]);
      
    } catch (error) {
      console.error('Failed to join pool:', error);
      alert('Failed to join pool');
    } finally {
      setIsLoading(false);
    }
  };

  const stakeWatt = async () => {
    if (!wattStakeAmount || selectedRigs.length === 0) {
      alert('Please enter WATT amount and select rigs');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call staking function
      // const tx = await miningPoolContract.stakeWatt(selectedRigs, ethers.utils.parseEther(wattStakeAmount));
      // await tx.wait();
      
      alert('WATT tokens staked successfully!');
      setWattStakeAmount('');
      setSelectedRigs([]);
      setShowStaking(false);
      
    } catch (error) {
      console.error('Failed to stake WATT:', error);
      alert('Failed to stake WATT tokens');
    } finally {
      setIsLoading(false);
    }
  };

  if (!poolStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading pool data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Pool Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">{poolStats.name}</h1>
          <p className="text-xl text-gray-300">Mining Pool Dashboard</p>
          <div className="flex justify-center items-center space-x-4 mt-4">
            <span className={`px-3 py-1 rounded-full text-sm ${
              poolStats.isActive ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {poolStats.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="text-gray-400">Fee: {poolStats.feePercentage}%</span>
          </div>
        </div>

        {/* Pool Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Hash Power</p>
                <p className="text-2xl font-bold">{poolStats.totalHashPower.toLocaleString()}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Miners</p>
                <p className="text-2xl font-bold">{poolStats.totalMiners}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pool Fee</p>
                <p className="text-2xl font-bold">{poolStats.feePercentage}%</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Efficiency</p>
                <p className="text-2xl font-bold">98.5%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Miners List */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Users className="mr-3" />
                Active Miners
              </h2>
              
              <div className="space-y-4">
                {miners.map((miner, index) => (
                  <div
                    key={miner.address}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{miner.address}</p>
                          <p className="text-sm text-gray-400">{miner.rigIds.length} rigs</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{miner.totalHashPower.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">Hash Power</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">WATT Cost</p>
                        <p className="font-semibold">{miner.totalWattConsumption}/block</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Pending Rewards</p>
                        <p className="font-semibold text-green-400">{miner.pendingRewards} NU</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className={`font-semibold ${miner.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {miner.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pool Actions */}
          <div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-xl font-bold mb-4">Join Pool</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Your Mining Rigs</label>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((rigId) => (
                      <label key={rigId} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedRigs.includes(rigId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRigs([...selectedRigs, rigId]);
                            } else {
                              setSelectedRigs(selectedRigs.filter(id => id !== rigId));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">Mining Rig #{rigId}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={joinPool}
                  disabled={selectedRigs.length === 0 || isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  {isLoading ? 'Joining...' : 'Join Pool'}
                </button>
              </div>
            </div>

            {/* WATT Staking */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Award className="mr-2" />
                WATT Staking
              </h2>
              
              {!showStaking ? (
                <div className="text-center">
                  <p className="text-gray-300 mb-4">Stake your powered-off rigs to earn WATT rewards</p>
                  <button
                    onClick={() => setShowStaking(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Start Staking
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">WATT Amount</label>
                    <input
                      type="number"
                      value={wattStakeAmount}
                      onChange={(e) => setWattStakeAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                      placeholder="Enter WATT amount"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Powered-off Rigs</label>
                    <div className="space-y-2">
                      {[1, 2, 3].map((rigId) => (
                        <label key={rigId} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedRigs.includes(rigId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRigs([...selectedRigs, rigId]);
                              } else {
                                setSelectedRigs(selectedRigs.filter(id => id !== rigId));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">Rig #{rigId} (Offline)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={stakeWatt}
                      disabled={!wattStakeAmount || selectedRigs.length === 0 || isLoading}
                      className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      {isLoading ? 'Staking...' : 'Stake WATT'}
                    </button>
                    <button
                      onClick={() => setShowStaking(false)}
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

        {/* Pool Information */}
        <div className="mt-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-6">Pool Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Pool Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool ID:</span>
                    <span className="font-mono">#{poolStats.poolId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Operator:</span>
                    <span className="font-mono">{poolStats.operator.slice(0, 10)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool URL:</span>
                    <a href={poolStats.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      {poolStats.url}
                    </a>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Rewards & Payouts</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payout Frequency:</span>
                    <span>Every hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Minimum Payout:</span>
                    <span>1 NU</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Payout:</span>
                    <span>2 minutes ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiningPoolDashboard;