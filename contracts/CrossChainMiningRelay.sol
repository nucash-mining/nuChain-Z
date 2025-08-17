// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CrossChainMiningRelay
 * @dev Relays mining data from Altcoinchain/Polygon to nuChain L2 zk-Rollup
 * Handles hash rate submissions, block confirmations, and WATT consumption tracking
 */
contract CrossChainMiningRelay is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // WATT token contract
    IERC20 public immutable wattToken;
    
    // nuChain endpoint for cross-chain messaging
    address public nuChainRelayer;
    
    // Mining submission counter
    Counters.Counter private _submissionCounter;
    
    struct HashRateSubmission {
        uint256 submissionId;
        address miningPool;
        address miner;
        uint256[] rigIds;
        uint256 totalHashPower;
        uint256 hashPowerPercentage; // % of total network hash power
        string blockTxId;            // Transaction ID of the block
        uint256 wattConsumed;        // WATT tokens consumed
        address stakingAddress;      // Address receiving WATT consumption
        uint256 blockHeight;
        uint256 timestamp;
        bool confirmed;
        string targetChain;          // "nuchain-1"
    }
    
    struct MiningPoolData {
        address operator;
        string poolName;
        uint256 totalHashPower;
        uint256 totalMiners;
        uint256 feePercentage;
        bool isActive;
        uint256 wattStaked;          // 100,000 WATT staked
        string nuChainAddress;       // nuChain payout address
    }
    
    // Storage
    mapping(uint256 => HashRateSubmission) public hashRateSubmissions;
    mapping(address => MiningPoolData) public miningPools;
    mapping(address => uint256[]) public poolSubmissions;
    mapping(string => bool) public processedBlockTxIds;
    
    // Global statistics
    uint256 public totalNetworkHashPower;
    uint256 public totalWattConsumed;
    uint256 public totalBlocksSubmitted;
    
    // Events
    event HashRateSubmitted(
        uint256 indexed submissionId,
        address indexed miningPool,
        address indexed miner,
        uint256 totalHashPower,
        uint256 hashPowerPercentage,
        string blockTxId,
        uint256 wattConsumed
    );
    
    event BlockConfirmed(
        uint256 indexed submissionId,
        string blockTxId,
        uint256 blockHeight
    );
    
    event MiningPoolRegistered(
        address indexed operator,
        string poolName,
        uint256 wattStaked,
        string nuChainAddress
    );
    
    event CrossChainMessageSent(
        string targetChain,
        bytes payload,
        uint256 timestamp
    );

    constructor(address _wattToken, address _nuChainRelayer) {
        require(_wattToken != address(0), "Invalid WATT token address");
        require(_nuChainRelayer != address(0), "Invalid nuChain relayer address");
        
        wattToken = IERC20(_wattToken);
        nuChainRelayer = _nuChainRelayer;
    }

    /**
     * @dev Register mining pool with nuChain integration
     * @param _poolName Name of the mining pool
     * @param _nuChainAddress nuChain payout address
     * @param _feePercentage Pool fee percentage (0-10%)
     */
    function registerMiningPool(
        string calldata _poolName,
        string calldata _nuChainAddress,
        uint256 _feePercentage
    ) external nonReentrant {
        require(bytes(_poolName).length > 0, "Pool name required");
        require(bytes(_nuChainAddress).length > 0, "nuChain address required");
        require(_feePercentage <= 10, "Fee too high (max 10%)");
        require(miningPools[msg.sender].operator == address(0), "Pool already registered");
        
        // Verify 100,000 WATT stake
        uint256 requiredStake = 100000 * 10**18;
        require(wattToken.balanceOf(msg.sender) >= requiredStake, "Insufficient WATT balance");
        
        // Transfer WATT stake
        wattToken.safeTransferFrom(msg.sender, address(this), requiredStake);
        
        // Register mining pool
        miningPools[msg.sender] = MiningPoolData({
            operator: msg.sender,
            poolName: _poolName,
            totalHashPower: 0,
            totalMiners: 0,
            feePercentage: _feePercentage,
            isActive: true,
            wattStaked: requiredStake,
            nuChainAddress: _nuChainAddress
        });
        
        emit MiningPoolRegistered(msg.sender, _poolName, requiredStake, _nuChainAddress);
        
        // Send registration to nuChain
        _sendToNuChain("pool_registration", abi.encode(msg.sender, _poolName, _nuChainAddress, _feePercentage));
    }

    /**
     * @dev Submit hash rate and block confirmation to nuChain
     * @param _miner Miner address
     * @param _rigIds Array of mining rig NFT IDs
     * @param _totalHashPower Total hash power from rigs
     * @param _blockTxId Transaction ID of the mined block
     * @param _wattConsumed WATT tokens consumed for mining
     * @param _stakingAddress Address receiving WATT consumption
     */
    function submitHashRate(
        address _miner,
        uint256[] calldata _rigIds,
        uint256 _totalHashPower,
        string calldata _blockTxId,
        uint256 _wattConsumed,
        address _stakingAddress
    ) external nonReentrant {
        require(miningPools[msg.sender].isActive, "Pool not active");
        require(_totalHashPower > 0, "Invalid hash power");
        require(!processedBlockTxIds[_blockTxId], "Block already processed");
        require(_wattConsumed > 0, "WATT consumption required");
        
        _submissionCounter.increment();
        uint256 submissionId = _submissionCounter.current();
        
        // Calculate hash power percentage
        uint256 hashPowerPercentage = totalNetworkHashPower > 0 
            ? (_totalHashPower * 10000) / totalNetworkHashPower  // Basis points
            : 10000; // 100% if first submission
        
        // Create submission
        HashRateSubmission storage submission = hashRateSubmissions[submissionId];
        submission.submissionId = submissionId;
        submission.miningPool = msg.sender;
        submission.miner = _miner;
        submission.rigIds = _rigIds;
        submission.totalHashPower = _totalHashPower;
        submission.hashPowerPercentage = hashPowerPercentage;
        submission.blockTxId = _blockTxId;
        submission.wattConsumed = _wattConsumed;
        submission.stakingAddress = _stakingAddress;
        submission.blockHeight = block.number;
        submission.timestamp = block.timestamp;
        submission.confirmed = false;
        submission.targetChain = "nuchain-1";
        
        // Update global stats
        totalNetworkHashPower += _totalHashPower;
        totalWattConsumed += _wattConsumed;
        totalBlocksSubmitted++;
        
        // Mark block as processed
        processedBlockTxIds[_blockTxId] = true;
        
        // Add to pool submissions
        poolSubmissions[msg.sender].push(submissionId);
        
        // Update pool stats
        MiningPoolData storage pool = miningPools[msg.sender];
        pool.totalHashPower += _totalHashPower;
        
        emit HashRateSubmitted(
            submissionId,
            msg.sender,
            _miner,
            _totalHashPower,
            hashPowerPercentage,
            _blockTxId,
            _wattConsumed
        );
        
        // Send to nuChain for reward distribution
        bytes memory payload = abi.encode(
            "hash_rate_submission",
            submissionId,
            msg.sender,
            _miner,
            _rigIds,
            _totalHashPower,
            hashPowerPercentage,
            _blockTxId,
            _wattConsumed,
            _stakingAddress,
            pool.nuChainAddress,
            pool.feePercentage
        );
        
        _sendToNuChain("mining_submission", payload);
    }

    /**
     * @dev Confirm block and finalize submission
     * @param _submissionId Submission ID to confirm
     * @param _blockHeight Confirmed block height
     */
    function confirmBlock(uint256 _submissionId, uint256 _blockHeight) external {
        require(msg.sender == nuChainRelayer, "Only nuChain relayer can confirm");
        require(hashRateSubmissions[_submissionId].submissionId != 0, "Submission not found");
        require(!hashRateSubmissions[_submissionId].confirmed, "Already confirmed");
        
        HashRateSubmission storage submission = hashRateSubmissions[_submissionId];
        submission.confirmed = true;
        submission.blockHeight = _blockHeight;
        
        emit BlockConfirmed(_submissionId, submission.blockTxId, _blockHeight);
        
        // Process WATT consumption
        _processWattConsumption(submission);
    }

    /**
     * @dev Process WATT consumption for mining
     * @param submission Hash rate submission data
     */
    function _processWattConsumption(HashRateSubmission storage submission) internal {
        // Transfer WATT from miner to staking address
        // This would typically be handled by the mining pool contract
        // For now, we emit an event for tracking
        
        // Update mining pool stats
        MiningPoolData storage pool = miningPools[submission.miningPool];
        
        // Send WATT consumption notification to nuChain
        bytes memory payload = abi.encode(
            "watt_consumption",
            submission.submissionId,
            submission.miner,
            submission.wattConsumed,
            submission.stakingAddress,
            pool.nuChainAddress
        );
        
        _sendToNuChain("watt_consumption", payload);
    }

    /**
     * @dev Send cross-chain message to nuChain
     * @param messageType Type of message
     * @param payload Message payload
     */
    function _sendToNuChain(string memory messageType, bytes memory payload) internal {
        // This would integrate with LayerZero or similar cross-chain protocol
        // For now, emit event for off-chain relayer to process
        
        bytes memory fullPayload = abi.encode(messageType, payload, block.timestamp);
        
        emit CrossChainMessageSent("nuchain-1", fullPayload, block.timestamp);
    }

    /**
     * @dev Get mining pool information
     * @param _operator Pool operator address
     */
    function getMiningPool(address _operator) external view returns (
        string memory poolName,
        uint256 totalHashPower,
        uint256 totalMiners,
        uint256 feePercentage,
        bool isActive,
        uint256 wattStaked,
        string memory nuChainAddress
    ) {
        MiningPoolData storage pool = miningPools[_operator];
        return (
            pool.poolName,
            pool.totalHashPower,
            pool.totalMiners,
            pool.feePercentage,
            pool.isActive,
            pool.wattStaked,
            pool.nuChainAddress
        );
    }

    /**
     * @dev Get hash rate submission details
     * @param _submissionId Submission ID
     */
    function getSubmission(uint256 _submissionId) external view returns (
        address miningPool,
        address miner,
        uint256 totalHashPower,
        uint256 hashPowerPercentage,
        string memory blockTxId,
        uint256 wattConsumed,
        bool confirmed
    ) {
        HashRateSubmission storage submission = hashRateSubmissions[_submissionId];
        return (
            submission.miningPool,
            submission.miner,
            submission.totalHashPower,
            submission.hashPowerPercentage,
            submission.blockTxId,
            submission.wattConsumed,
            submission.confirmed
        );
    }

    /**
     * @dev Get pool submissions
     * @param _poolOperator Pool operator address
     */
    function getPoolSubmissions(address _poolOperator) external view returns (uint256[] memory) {
        return poolSubmissions[_poolOperator];
    }

    /**
     * @dev Update nuChain relayer address
     * @param _newRelayer New relayer address
     */
    function updateNuChainRelayer(address _newRelayer) external onlyOwner {
        require(_newRelayer != address(0), "Invalid relayer address");
        nuChainRelayer = _newRelayer;
    }

    /**
     * @dev Emergency withdrawal for pool operators
     * @param _amount Amount to withdraw
     */
    function emergencyWithdrawStake(uint256 _amount) external nonReentrant {
        MiningPoolData storage pool = miningPools[msg.sender];
        require(pool.operator == msg.sender, "Not pool operator");
        require(pool.wattStaked >= _amount, "Insufficient staked amount");
        
        pool.wattStaked -= _amount;
        if (pool.wattStaked < 100000 * 10**18) {
            pool.isActive = false; // Deactivate pool if below minimum stake
        }
        
        wattToken.safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev Get global mining statistics
     */
    function getGlobalStats() external view returns (
        uint256 networkHashPower,
        uint256 totalWattConsumed,
        uint256 totalBlocks,
        uint256 totalSubmissions
    ) {
        return (
            totalNetworkHashPower,
            totalWattConsumed,
            totalBlocksSubmitted,
            _submissionCounter.current()
        );
    }
}