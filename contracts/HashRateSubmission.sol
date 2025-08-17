// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title HashRateSubmission
 * @dev Submits hash rate data from mining pools to nuChain L2 zk-Rollup
 * Tracks block confirmations and WATT consumption for cross-chain mining
 */
contract HashRateSubmission is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // WATT token contract
    IERC20 public immutable wattToken;
    
    // Submission counter
    Counters.Counter private _submissionCounter;
    
    struct HashSubmission {
        uint256 submissionId;
        address miningPool;
        address miner;
        uint256[] rigIds;
        uint256 totalHashPower;
        uint256 networkHashPowerPercentage; // % of total network hash power
        string blockTxId;                   // Transaction ID of the block
        uint256 wattConsumed;               // WATT tokens consumed
        address stakingAddress;             // Address receiving WATT consumption
        uint256 blockHeight;
        uint256 timestamp;
        bool confirmed;
        string targetChain;                 // "nuchain-1"
    }
    
    struct NetworkStats {
        uint256 totalHashPower;
        uint256 totalMiners;
        uint256 totalWattConsumed;
        uint256 totalBlocksSubmitted;
        uint256 lastUpdateHeight;
    }
    
    // Storage
    mapping(uint256 => HashSubmission) public hashSubmissions;
    mapping(address => uint256[]) public poolSubmissions;
    mapping(string => bool) public processedBlockTxIds;
    mapping(address => bool) public authorizedPools;
    
    NetworkStats public networkStats;
    
    // Events
    event HashRateSubmitted(
        uint256 indexed submissionId,
        address indexed miningPool,
        address indexed miner,
        uint256 totalHashPower,
        uint256 networkPercentage,
        string blockTxId,
        uint256 wattConsumed
    );
    
    event BlockConfirmed(
        uint256 indexed submissionId,
        string blockTxId,
        uint256 blockHeight
    );
    
    event CrossChainMessageSent(
        string targetChain,
        bytes payload,
        uint256 timestamp
    );
    
    event PoolAuthorized(
        address indexed poolAddress,
        bool authorized
    );

    constructor(address _wattToken) {
        require(_wattToken != address(0), "Invalid WATT token address");
        wattToken = IERC20(_wattToken);
    }

    /**
     * @dev Submit hash rate and block data to nuChain
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
        require(authorizedPools[msg.sender], "Pool not authorized");
        require(_totalHashPower > 0, "Invalid hash power");
        require(!processedBlockTxIds[_blockTxId], "Block already processed");
        require(_wattConsumed > 0, "WATT consumption required");
        
        _submissionCounter.increment();
        uint256 submissionId = _submissionCounter.current();
        
        // Calculate network hash power percentage
        uint256 networkPercentage = networkStats.totalHashPower > 0 
            ? (_totalHashPower * 10000) / networkStats.totalHashPower  // Basis points
            : 10000; // 100% if first submission
        
        // Create submission
        HashSubmission storage submission = hashSubmissions[submissionId];
        submission.submissionId = submissionId;
        submission.miningPool = msg.sender;
        submission.miner = _miner;
        submission.rigIds = _rigIds;
        submission.totalHashPower = _totalHashPower;
        submission.networkHashPowerPercentage = networkPercentage;
        submission.blockTxId = _blockTxId;
        submission.wattConsumed = _wattConsumed;
        submission.stakingAddress = _stakingAddress;
        submission.blockHeight = block.number;
        submission.timestamp = block.timestamp;
        submission.confirmed = false;
        submission.targetChain = "nuchain-1";
        
        // Update network stats
        networkStats.totalHashPower += _totalHashPower;
        networkStats.totalWattConsumed += _wattConsumed;
        networkStats.totalBlocksSubmitted++;
        networkStats.lastUpdateHeight = block.number;
        
        // Mark block as processed
        processedBlockTxIds[_blockTxId] = true;
        
        // Add to pool submissions
        poolSubmissions[msg.sender].push(submissionId);
        
        emit HashRateSubmitted(
            submissionId,
            msg.sender,
            _miner,
            _totalHashPower,
            networkPercentage,
            _blockTxId,
            _wattConsumed
        );
        
        // Send to nuChain for reward distribution
        _sendToNuChain(submissionId, submission);
    }

    /**
     * @dev Confirm block and finalize submission
     * @param _submissionId Submission ID to confirm
     * @param _blockHeight Confirmed block height
     */
    function confirmBlock(uint256 _submissionId, uint256 _blockHeight) external onlyOwner {
        require(hashSubmissions[_submissionId].submissionId != 0, "Submission not found");
        require(!hashSubmissions[_submissionId].confirmed, "Already confirmed");
        
        HashSubmission storage submission = hashSubmissions[_submissionId];
        submission.confirmed = true;
        submission.blockHeight = _blockHeight;
        
        emit BlockConfirmed(_submissionId, submission.blockTxId, _blockHeight);
        
        // Process WATT consumption
        _processWattConsumption(submission);
    }

    /**
     * @dev Authorize mining pool for hash rate submission
     * @param _poolAddress Pool contract address
     * @param _authorized Authorization status
     */
    function authorizePool(address _poolAddress, bool _authorized) external onlyOwner {
        authorizedPools[_poolAddress] = _authorized;
        emit PoolAuthorized(_poolAddress, _authorized);
    }

    /**
     * @dev Get hash rate submission details
     * @param _submissionId Submission ID
     */
    function getSubmission(uint256 _submissionId) external view returns (
        address miningPool,
        address miner,
        uint256 totalHashPower,
        uint256 networkPercentage,
        string memory blockTxId,
        uint256 wattConsumed,
        bool confirmed
    ) {
        HashSubmission storage submission = hashSubmissions[_submissionId];
        return (
            submission.miningPool,
            submission.miner,
            submission.totalHashPower,
            submission.networkHashPowerPercentage,
            submission.blockTxId,
            submission.wattConsumed,
            submission.confirmed
        );
    }

    /**
     * @dev Get network statistics
     */
    function getNetworkStats() external view returns (
        uint256 totalHashPower,
        uint256 totalMiners,
        uint256 totalWattConsumed,
        uint256 totalBlocksSubmitted
    ) {
        return (
            networkStats.totalHashPower,
            networkStats.totalMiners,
            networkStats.totalWattConsumed,
            networkStats.totalBlocksSubmitted
        );
    }

    function _sendToNuChain(uint256 submissionId, HashSubmission storage submission) internal {
        // Create cross-chain message payload
        bytes memory payload = abi.encode(
            "hash_rate_submission",
            submissionId,
            submission.miningPool,
            submission.miner,
            submission.rigIds,
            submission.totalHashPower,
            submission.networkHashPowerPercentage,
            submission.blockTxId,
            submission.wattConsumed,
            submission.stakingAddress
        );
        
        emit CrossChainMessageSent("nuchain-1", payload, block.timestamp);
    }

    function _processWattConsumption(HashSubmission storage submission) internal {
        // Process WATT consumption for mining
        // This would typically transfer WATT from miner to staking address
        
        emit CrossChainMessageSent(
            "nuchain-1",
            abi.encode(
                "watt_consumption",
                submission.submissionId,
                submission.miner,
                submission.wattConsumed,
                submission.stakingAddress
            ),
            block.timestamp
        );
    }
}