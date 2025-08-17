// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MiningPoolDeployment
 * @dev Contract for deploying mining pools with 100,000 WATT stake requirement
 * Pool operators can configure their pools and lock WATT tokens for nuChain L2 mining
 */
contract MiningPoolDeployment is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // WATT token contract
    IERC20 public immutable wattToken;
    
    // Pool deployment requirements
    uint256 public constant POOL_STAKE_REQUIREMENT = 100000 * 10**18; // 100,000 WATT
    uint256 public constant MAX_FEE_RATE = 10; // 10% maximum fee
    
    // Developer donation address
    address public constant DEVELOPER_ADDRESS = 0xFE4813250e155D4b746c039C179Df5Fe11C3240E;
    
    // Pool counter
    Counters.Counter private _poolIdCounter;
    
    struct MiningPool {
        uint256 poolId;
        address operator;
        string poolName;
        string domainName;          // Pool domain name
        address feePayoutAddress;   // Address to receive pool fees
        uint256 feeRate;           // Fee rate (0-10%)
        string logoImageUrl;       // Pool logo image URL
        uint256 stakedWatt;        // WATT tokens staked (100,000)
        uint256 developerDonation; // Optional donation to developer
        bool isActive;
        uint256 deployedAt;
        uint256 lastUpdated;
        
        // Pool statistics
        uint256 totalMiners;
        uint256 totalHashPower;
        uint256 totalRewardsPaid;
    }
    
    // Storage
    mapping(uint256 => MiningPool) public miningPools;
    mapping(address => uint256) public operatorToPool;
    mapping(string => bool) public domainNameTaken;
    mapping(uint256 => bool) public poolExists;
    
    // Global statistics
    uint256 public totalPoolsDeployed;
    uint256 public totalWattStaked;
    uint256 public totalDeveloperDonations;
    
    // Events
    event MiningPoolDeployed(
        uint256 indexed poolId,
        address indexed operator,
        string poolName,
        string domainName,
        uint256 feeRate,
        uint256 stakedWatt,
        uint256 developerDonation
    );
    
    event PoolUpdated(
        uint256 indexed poolId,
        string newLogoUrl,
        address newFeePayoutAddress
    );
    
    event DeveloperDonation(
        address indexed donor,
        uint256 amount
    );

    constructor(address _wattToken) {
        require(_wattToken != address(0), "Invalid WATT token address");
        wattToken = IERC20(_wattToken);
    }

    /**
     * @dev Deploy a new mining pool with 100,000 WATT stake
     * @param _poolName Name of the mining pool
     * @param _domainName Pool domain name (must be unique)
     * @param _feePayoutAddress Address to receive pool fees
     * @param _feeRate Pool fee rate (0-10%)
     * @param _logoImageUrl Pool logo image URL
     * @param _developerDonation Optional donation to developer
     */
    function deployMiningPool(
        string calldata _poolName,
        string calldata _domainName,
        address _feePayoutAddress,
        uint256 _feeRate,
        string calldata _logoImageUrl,
        uint256 _developerDonation
    ) external nonReentrant returns (uint256) {
        require(bytes(_poolName).length > 0, "Pool name required");
        require(bytes(_domainName).length > 0, "Domain name required");
        require(_feePayoutAddress != address(0), "Invalid fee payout address");
        require(_feeRate <= MAX_FEE_RATE, "Fee rate too high (max 10%)");
        require(!domainNameTaken[_domainName], "Domain name already taken");
        require(operatorToPool[msg.sender] == 0, "Already has a pool");
        
        // Calculate total WATT required
        uint256 totalWattRequired = POOL_STAKE_REQUIREMENT + _developerDonation;
        require(wattToken.balanceOf(msg.sender) >= totalWattRequired, "Insufficient WATT balance");
        
        // Transfer WATT tokens
        wattToken.safeTransferFrom(msg.sender, address(this), POOL_STAKE_REQUIREMENT);
        
        // Handle developer donation if specified
        if (_developerDonation > 0) {
            wattToken.safeTransferFrom(msg.sender, DEVELOPER_ADDRESS, _developerDonation);
            totalDeveloperDonations += _developerDonation;
            emit DeveloperDonation(msg.sender, _developerDonation);
        }

        _poolIdCounter.increment();
        uint256 newPoolId = _poolIdCounter.current();

        // Create mining pool
        MiningPool storage newPool = miningPools[newPoolId];
        newPool.poolId = newPoolId;
        newPool.operator = msg.sender;
        newPool.poolName = _poolName;
        newPool.domainName = _domainName;
        newPool.feePayoutAddress = _feePayoutAddress;
        newPool.feeRate = _feeRate;
        newPool.logoImageUrl = _logoImageUrl;
        newPool.stakedWatt = POOL_STAKE_REQUIREMENT;
        newPool.developerDonation = _developerDonation;
        newPool.isActive = true;
        newPool.deployedAt = block.timestamp;
        newPool.lastUpdated = block.timestamp;

        // Update mappings
        poolExists[newPoolId] = true;
        operatorToPool[msg.sender] = newPoolId;
        domainNameTaken[_domainName] = true;
        
        // Update global stats
        totalPoolsDeployed++;
        totalWattStaked += POOL_STAKE_REQUIREMENT;

        emit MiningPoolDeployed(
            newPoolId,
            msg.sender,
            _poolName,
            _domainName,
            _feeRate,
            POOL_STAKE_REQUIREMENT,
            _developerDonation
        );

        return newPoolId;
    }

    /**
     * @dev Update pool logo and fee payout address
     * @param _poolId Pool ID to update
     * @param _newLogoUrl New logo image URL
     * @param _newFeePayoutAddress New fee payout address
     */
    function updatePool(
        uint256 _poolId,
        string calldata _newLogoUrl,
        address _newFeePayoutAddress
    ) external {
        require(poolExists[_poolId], "Pool does not exist");
        require(miningPools[_poolId].operator == msg.sender, "Not pool operator");
        require(_newFeePayoutAddress != address(0), "Invalid fee payout address");

        MiningPool storage pool = miningPools[_poolId];
        pool.logoImageUrl = _newLogoUrl;
        pool.feePayoutAddress = _newFeePayoutAddress;
        pool.lastUpdated = block.timestamp;

        emit PoolUpdated(_poolId, _newLogoUrl, _newFeePayoutAddress);
    }

    /**
     * @dev Get mining pool information
     * @param _poolId Pool ID
     */
    function getPool(uint256 _poolId) external view returns (
        address operator,
        string memory poolName,
        string memory domainName,
        address feePayoutAddress,
        uint256 feeRate,
        string memory logoImageUrl,
        uint256 stakedWatt,
        bool isActive,
        uint256 totalMiners,
        uint256 totalHashPower
    ) {
        require(poolExists[_poolId], "Pool does not exist");
        
        MiningPool storage pool = miningPools[_poolId];
        return (
            pool.operator,
            pool.poolName,
            pool.domainName,
            pool.feePayoutAddress,
            pool.feeRate,
            pool.logoImageUrl,
            pool.stakedWatt,
            pool.isActive,
            pool.totalMiners,
            pool.totalHashPower
        );
    }

    /**
     * @dev Get all deployed pools
     */
    function getAllPools() external view returns (uint256[] memory) {
        uint256[] memory poolIds = new uint256[](totalPoolsDeployed);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= _poolIdCounter.current(); i++) {
            if (poolExists[i]) {
                poolIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return poolIds;
    }

    /**
     * @dev Check if domain name is available
     * @param _domainName Domain name to check
     */
    function isDomainAvailable(string calldata _domainName) external view returns (bool) {
        return !domainNameTaken[_domainName];
    }

    /**
     * @dev Get global statistics
     */
    function getGlobalStats() external view returns (
        uint256 totalPools,
        uint256 totalStaked,
        uint256 totalDonations
    ) {
        return (totalPoolsDeployed, totalWattStaked, totalDeveloperDonations);
    }

    /**
     * @dev Emergency withdrawal function (only owner)
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        wattToken.safeTransfer(owner(), _amount);
    }

    /**
     * @dev Deactivate a pool (only owner or operator)
     * @param _poolId Pool ID to deactivate
     */
    function deactivatePool(uint256 _poolId) external {
        require(poolExists[_poolId], "Pool does not exist");
        require(
            miningPools[_poolId].operator == msg.sender || owner() == msg.sender,
            "Not authorized"
        );
        
        miningPools[_poolId].isActive = false;
        miningPools[_poolId].lastUpdated = block.timestamp;
    }
}