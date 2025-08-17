// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface INFTMiningRig {
    function getMiningRig(uint256 _rigId) external view returns (
        address owner,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        uint256 genesisBadgeMultiplier,
        bool isPoweredOn,
        uint256 componentCount
    );
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title MiningPoolOperator
 * @dev Mining pool contract requiring 100,000 WATT stake from pool operators
 * Pool operators don't pay WATT fees, but miners in their pools do
 */
contract MiningPoolOperator is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // WATT token contract
    IERC20 public immutable wattToken;
    
    // NFT Mining Rig contract
    INFTMiningRig public immutable nftMiningRig;
    
    // Pool operator stake requirement
    uint256 public constant OPERATOR_STAKE_REQUIREMENT = 100000 * 10**18; // 100,000 WATT
    
    // Pool counter
    Counters.Counter private _poolIdCounter;
    
    struct MiningPool {
        uint256 poolId;
        address operator;
        string poolName;
        string poolUrl;          // Netlify URL for pool frontend
        uint256 operatorStake;   // WATT tokens staked by operator
        uint256 feePercentage;   // Pool fee (0-10%)
        uint256 totalHashPower;  // Combined hash power of all miners
        uint256 totalMiners;     // Number of active miners
        bool isActive;
        uint256 createdAt;
        uint256 lastUpdated;
        
        // Pool settings
        uint256 minPayoutThreshold;
        uint256 payoutInterval;  // Seconds between payouts
        bool autoCompound;       // Auto-compound WATT rewards
    }
    
    struct Miner {
        address minerAddress;
        uint256[] rigIds;        // NFT Mining Rig IDs
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        uint256 joinedAt;
        uint256 lastPayout;
        uint256 pendingRewards;
        bool isActive;
    }
    
    struct WattStaking {
        address staker;
        uint256[] rigIds;        // Powered-off NFT rigs for staking
        uint256 stakedAmount;    // WATT tokens staked
        uint256 stakeWeight;     // Based on NFT hash power + Genesis Badge
        uint256 stakedAt;
        uint256 lastRewardClaim;
        uint256 pendingRewards;
    }
    
    // Storage
    mapping(uint256 => MiningPool) public miningPools;
    mapping(address => uint256) public operatorToPool;
    mapping(uint256 => mapping(address => Miner)) public poolMiners;
    mapping(uint256 => address[]) public poolMinersList;
    mapping(address => WattStaking) public wattStakers;
    mapping(uint256 => bool) public poolExists;
    
    // WATT staking pool
    uint256 public totalWattStaked;
    uint256 public totalStakeWeight;
    uint256 public wattRewardPool;
    
    // Events
    event PoolCreated(
        uint256 indexed poolId,
        address indexed operator,
        string poolName,
        string poolUrl,
        uint256 operatorStake
    );
    
    event MinerJoined(
        uint256 indexed poolId,
        address indexed miner,
        uint256[] rigIds,
        uint256 totalHashPower
    );
    
    event MinerLeft(
        uint256 indexed poolId,
        address indexed miner
    );
    
    event WattStaked(
        address indexed staker,
        uint256[] rigIds,
        uint256 amount,
        uint256 stakeWeight
    );
    
    event WattUnstaked(
        address indexed staker,
        uint256 amount
    );
    
    event RewardsPaid(
        uint256 indexed poolId,
        address indexed miner,
        uint256 amount
    );

    constructor(
        address _wattToken,
        address _nftMiningRig
    ) {
        require(_wattToken != address(0), "Invalid WATT token address");
        require(_nftMiningRig != address(0), "Invalid NFT Mining Rig address");
        
        wattToken = IERC20(_wattToken);
        nftMiningRig = INFTMiningRig(_nftMiningRig);
    }

    /**
     * @dev Create a new mining pool (requires 100,000 WATT stake)
     * @param _poolName Name of the mining pool
     * @param _poolUrl Netlify URL for pool frontend
     * @param _feePercentage Pool fee percentage (0-10%)
     * @param _minPayoutThreshold Minimum payout threshold
     * @param _payoutInterval Payout interval in seconds
     */
    function createMiningPool(
        string calldata _poolName,
        string calldata _poolUrl,
        uint256 _feePercentage,
        uint256 _minPayoutThreshold,
        uint256 _payoutInterval
    ) external nonReentrant returns (uint256) {
        require(bytes(_poolName).length > 0, "Pool name required");
        require(bytes(_poolUrl).length > 0, "Pool URL required");
        require(_feePercentage <= 10, "Fee too high (max 10%)");
        require(operatorToPool[msg.sender] == 0, "Already has a pool");
        
        // Check WATT balance and transfer stake
        require(wattToken.balanceOf(msg.sender) >= OPERATOR_STAKE_REQUIREMENT, "Insufficient WATT balance");
        wattToken.safeTransferFrom(msg.sender, address(this), OPERATOR_STAKE_REQUIREMENT);

        _poolIdCounter.increment();
        uint256 newPoolId = _poolIdCounter.current();

        // Create mining pool
        MiningPool storage newPool = miningPools[newPoolId];
        newPool.poolId = newPoolId;
        newPool.operator = msg.sender;
        newPool.poolName = _poolName;
        newPool.poolUrl = _poolUrl;
        newPool.operatorStake = OPERATOR_STAKE_REQUIREMENT;
        newPool.feePercentage = _feePercentage;
        newPool.minPayoutThreshold = _minPayoutThreshold;
        newPool.payoutInterval = _payoutInterval;
        newPool.isActive = true;
        newPool.createdAt = block.timestamp;
        newPool.lastUpdated = block.timestamp;

        // Update mappings
        poolExists[newPoolId] = true;
        operatorToPool[msg.sender] = newPoolId;

        emit PoolCreated(newPoolId, msg.sender, _poolName, _poolUrl, OPERATOR_STAKE_REQUIREMENT);

        return newPoolId;
    }

    /**
     * @dev Join a mining pool with NFT mining rigs
     * @param _poolId Pool ID to join
     * @param _rigIds Array of NFT Mining Rig IDs
     */
    function joinPool(uint256 _poolId, uint256[] calldata _rigIds) external nonReentrant {
        require(poolExists[_poolId], "Pool does not exist");
        require(miningPools[_poolId].isActive, "Pool not active");
        require(_rigIds.length > 0, "No rigs provided");
        require(poolMiners[_poolId][msg.sender].minerAddress == address(0), "Already in pool");

        // Verify rig ownership and calculate total stats
        uint256 totalHashPower = 0;
        uint256 totalWattConsumption = 0;

        for (uint256 i = 0; i < _rigIds.length; i++) {
            require(nftMiningRig.ownerOf(_rigIds[i]) == msg.sender, "Not rig owner");
            
            (,uint256 hashPower, uint256 wattConsumption,,,) = nftMiningRig.getMiningRig(_rigIds[i]);
            totalHashPower += hashPower;
            totalWattConsumption += wattConsumption;
        }

        // Create miner entry
        Miner storage newMiner = poolMiners[_poolId][msg.sender];
        newMiner.minerAddress = msg.sender;
        newMiner.rigIds = _rigIds;
        newMiner.totalHashPower = totalHashPower;
        newMiner.totalWattConsumption = totalWattConsumption;
        newMiner.joinedAt = block.timestamp;
        newMiner.lastPayout = block.timestamp;
        newMiner.isActive = true;

        // Update pool stats
        MiningPool storage pool = miningPools[_poolId];
        pool.totalHashPower += totalHashPower;
        pool.totalMiners += 1;
        pool.lastUpdated = block.timestamp;
        
        poolMinersList[_poolId].push(msg.sender);

        emit MinerJoined(_poolId, msg.sender, _rigIds, totalHashPower);
    }

    /**
     * @dev Leave a mining pool
     * @param _poolId Pool ID to leave
     */
    function leavePool(uint256 _poolId) external nonReentrant {
        require(poolExists[_poolId], "Pool does not exist");
        require(poolMiners[_poolId][msg.sender].isActive, "Not in pool");

        Miner storage miner = poolMiners[_poolId][msg.sender];
        
        // Pay out pending rewards
        if (miner.pendingRewards > 0) {
            _payoutMiner(_poolId, msg.sender);
        }

        // Update pool stats
        MiningPool storage pool = miningPools[_poolId];
        pool.totalHashPower -= miner.totalHashPower;
        pool.totalMiners -= 1;
        pool.lastUpdated = block.timestamp;

        // Remove miner
        miner.isActive = false;
        
        // Remove from miners list
        _removeMinerFromList(_poolId, msg.sender);

        emit MinerLeft(_poolId, msg.sender);
    }

    /**
     * @dev Stake WATT tokens with powered-off NFT rigs
     * @param _rigIds Array of powered-off NFT Mining Rig IDs
     * @param _wattAmount Amount of WATT tokens to stake
     */
    function stakeWatt(uint256[] calldata _rigIds, uint256 _wattAmount) external nonReentrant {
        require(_rigIds.length > 0, "No rigs provided");
        require(_wattAmount > 0, "Invalid WATT amount");
        require(wattToken.balanceOf(msg.sender) >= _wattAmount, "Insufficient WATT balance");

        // Verify rig ownership and powered-off status
        uint256 totalStakeWeight = 0;
        for (uint256 i = 0; i < _rigIds.length; i++) {
            require(nftMiningRig.ownerOf(_rigIds[i]) == msg.sender, "Not rig owner");
            
            (,uint256 hashPower,,uint256 multiplier, bool isPoweredOn,) = nftMiningRig.getMiningRig(_rigIds[i]);
            require(!isPoweredOn, "Rig must be powered off");
            
            // Calculate stake weight: hash power * Genesis Badge multiplier
            totalStakeWeight += (hashPower * multiplier) / 100;
        }

        // Transfer WATT tokens
        wattToken.safeTransferFrom(msg.sender, address(this), _wattAmount);

        // Update or create staking entry
        WattStaking storage staking = wattStakers[msg.sender];
        if (staking.staker == address(0)) {
            staking.staker = msg.sender;
            staking.stakedAt = block.timestamp;
        }
        
        // Add to existing stake
        for (uint256 i = 0; i < _rigIds.length; i++) {
            staking.rigIds.push(_rigIds[i]);
        }
        staking.stakedAmount += _wattAmount;
        staking.stakeWeight += totalStakeWeight;
        staking.lastRewardClaim = block.timestamp;

        // Update global stats
        totalWattStaked += _wattAmount;
        totalStakeWeight += totalStakeWeight;

        emit WattStaked(msg.sender, _rigIds, _wattAmount, totalStakeWeight);
    }

    /**
     * @dev Unstake WATT tokens and NFT rigs
     * @param _wattAmount Amount of WATT tokens to unstake
     */
    function unstakeWatt(uint256 _wattAmount) external nonReentrant {
        WattStaking storage staking = wattStakers[msg.sender];
        require(staking.staker == msg.sender, "No stake found");
        require(staking.stakedAmount >= _wattAmount, "Insufficient staked amount");

        // Claim pending rewards first
        if (staking.pendingRewards > 0) {
            _claimWattRewards(msg.sender);
        }

        // Calculate proportional stake weight reduction
        uint256 weightReduction = (staking.stakeWeight * _wattAmount) / staking.stakedAmount;
        
        // Update staking
        staking.stakedAmount -= _wattAmount;
        staking.stakeWeight -= weightReduction;

        // Update global stats
        totalWattStaked -= _wattAmount;
        totalStakeWeight -= weightReduction;

        // Transfer WATT tokens back
        wattToken.safeTransfer(msg.sender, _wattAmount);

        emit WattUnstaked(msg.sender, _wattAmount);
    }

    /**
     * @dev Get mining pool information
     * @param _poolId Pool ID
     */
    function getPool(uint256 _poolId) external view returns (
        address operator,
        string memory poolName,
        string memory poolUrl,
        uint256 operatorStake,
        uint256 feePercentage,
        uint256 totalHashPower,
        uint256 totalMiners,
        bool isActive
    ) {
        require(poolExists[_poolId], "Pool does not exist");
        
        MiningPool storage pool = miningPools[_poolId];
        return (
            pool.operator,
            pool.poolName,
            pool.poolUrl,
            pool.operatorStake,
            pool.feePercentage,
            pool.totalHashPower,
            pool.totalMiners,
            pool.isActive
        );
    }

    /**
     * @dev Get miner information in a pool
     * @param _poolId Pool ID
     * @param _miner Miner address
     */
    function getMiner(uint256 _poolId, address _miner) external view returns (
        uint256[] memory rigIds,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        uint256 pendingRewards,
        bool isActive
    ) {
        Miner storage miner = poolMiners[_poolId][_miner];
        return (
            miner.rigIds,
            miner.totalHashPower,
            miner.totalWattConsumption,
            miner.pendingRewards,
            miner.isActive
        );
    }

    /**
     * @dev Get WATT staking information
     * @param _staker Staker address
     */
    function getWattStaking(address _staker) external view returns (
        uint256[] memory rigIds,
        uint256 stakedAmount,
        uint256 stakeWeight,
        uint256 pendingRewards
    ) {
        WattStaking storage staking = wattStakers[_staker];
        return (
            staking.rigIds,
            staking.stakedAmount,
            staking.stakeWeight,
            staking.pendingRewards
        );
    }

    // Internal functions
    function _payoutMiner(uint256 _poolId, address _miner) internal {
        Miner storage miner = poolMiners[_poolId][_miner];
        uint256 amount = miner.pendingRewards;
        
        if (amount > 0) {
            miner.pendingRewards = 0;
            miner.lastPayout = block.timestamp;
            
            // Transfer from reward pool (would be funded by nuChain rewards)
            wattToken.safeTransfer(_miner, amount);
            
            emit RewardsPaid(_poolId, _miner, amount);
        }
    }

    function _claimWattRewards(address _staker) internal {
        WattStaking storage staking = wattStakers[_staker];
        uint256 rewards = staking.pendingRewards;
        
        if (rewards > 0) {
            staking.pendingRewards = 0;
            staking.lastRewardClaim = block.timestamp;
            
            wattToken.safeTransfer(_staker, rewards);
        }
    }

    function _removeMinerFromList(uint256 _poolId, address _miner) internal {
        address[] storage miners = poolMinersList[_poolId];
        for (uint256 i = 0; i < miners.length; i++) {
            if (miners[i] == _miner) {
                miners[i] = miners[miners.length - 1];
                miners.pop();
                break;
            }
        }
    }

    /**
     * @dev Emergency functions for owner
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    function pausePool(uint256 _poolId) external onlyOwner {
        require(poolExists[_poolId], "Pool does not exist");
        miningPools[_poolId].isActive = false;
    }

    function unpausePool(uint256 _poolId) external onlyOwner {
        require(poolExists[_poolId], "Pool does not exist");
        miningPools[_poolId].isActive = true;
    }
}