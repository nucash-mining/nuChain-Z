// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MiningRigConfiguration
 * @dev NFT contract for mining rig configurations using Mining Game components
 * Allows staking in mining pools and manages WATT consumption permissions
 */
contract MiningRigConfiguration is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // WATT token contract
    IERC20 public immutable wattToken;
    
    // Mining Game NFT contracts
    IERC1155 public immutable miningGameNFTs;
    
    // Configuration counter
    Counters.Counter private _configCounter;
    
    struct ComponentConfig {
        uint256 tokenId;        // Mining Game NFT token ID
        uint256 quantity;       // Number of this component
        uint256 hashPower;      // Hash power contribution
        uint256 wattCost;       // WATT cost per block
        string name;            // Component name
        string glbModel;        // 3D model file
    }
    
    struct MiningRigConfig {
        uint256 configId;
        address owner;
        string rigName;
        string nuChainPayoutAddress;
        ComponentConfig[] components;
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        uint256 wattAllowance;      // WATT tokens allowed for consumption
        uint256 genesisBadgeMultiplier; // 100-200% multiplier
        bool isStakedInPool;
        address stakedPoolAddress;
        uint256 createdAt;
        uint256 lastUpdated;
        bool isActive;
    }
    
    struct PoolStaking {
        address poolOperator;
        uint256[] rigIds;
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        uint256 stakedAt;
        bool isActive;
        string poolName;
        uint256 poolFeePercentage;
    }
    
    // Storage
    mapping(uint256 => MiningRigConfig) public miningRigConfigs;
    mapping(address => uint256[]) public ownerConfigs;
    mapping(uint256 => bool) public configExists;
    mapping(address => PoolStaking) public minerPoolStaking;
    mapping(address => mapping(uint256 => bool)) public wattConsumptionApproval;
    
    // Component specifications (same as Mining Game)
    mapping(uint256 => ComponentConfig) public componentSpecs;
    
    // Events
    event MiningRigConfigCreated(
        uint256 indexed configId,
        address indexed owner,
        string rigName,
        uint256 totalHashPower,
        uint256 totalWattConsumption
    );
    
    event RigStakedInPool(
        uint256 indexed configId,
        address indexed poolOperator,
        uint256 hashPower,
        uint256 wattConsumption
    );
    
    event RigUnstakedFromPool(
        uint256 indexed configId,
        address indexed poolOperator
    );
    
    event WattConsumptionApproved(
        uint256 indexed configId,
        address indexed poolOperator,
        uint256 allowance
    );
    
    event ConfigurationUpdated(
        uint256 indexed configId,
        uint256 newHashPower,
        uint256 newWattConsumption
    );

    constructor(
        address _wattToken,
        address _miningGameNFTs,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        require(_wattToken != address(0), "Invalid WATT token address");
        require(_miningGameNFTs != address(0), "Invalid Mining Game NFTs address");
        
        wattToken = IERC20(_wattToken);
        miningGameNFTs = IERC1155(_miningGameNFTs);
        
        _initializeComponentSpecs();
    }

    /**
     * @dev Create a new mining rig configuration
     * @param _rigName Name of the mining rig
     * @param _nuChainPayoutAddress nuChain address for rewards
     * @param _componentTokenIds Array of Mining Game NFT token IDs
     * @param _componentQuantities Array of component quantities
     * @param _wattAllowance WATT tokens allowed for consumption
     * @param _genesisBadgeId Genesis Badge NFT ID (0 if none)
     */
    function createMiningRigConfig(
        string calldata _rigName,
        string calldata _nuChainPayoutAddress,
        uint256[] calldata _componentTokenIds,
        uint256[] calldata _componentQuantities,
        uint256 _wattAllowance,
        uint256 _genesisBadgeId
    ) external nonReentrant returns (uint256) {
        require(bytes(_rigName).length > 0, "Rig name required");
        require(bytes(_nuChainPayoutAddress).length > 0, "nuChain address required");
        require(_componentTokenIds.length == _componentQuantities.length, "Array length mismatch");
        require(_componentTokenIds.length > 0, "Components required");
        
        // Validate required components
        _validateRequiredComponents(_componentTokenIds, _componentQuantities);
        
        // Verify component ownership
        for (uint256 i = 0; i < _componentTokenIds.length; i++) {
            require(
                miningGameNFTs.balanceOf(msg.sender, _componentTokenIds[i]) >= _componentQuantities[i],
                "Insufficient component balance"
            );
        }
        
        _configCounter.increment();
        uint256 newConfigId = _configCounter.current();
        
        // Create configuration
        MiningRigConfig storage newConfig = miningRigConfigs[newConfigId];
        newConfig.configId = newConfigId;
        newConfig.owner = msg.sender;
        newConfig.rigName = _rigName;
        newConfig.nuChainPayoutAddress = _nuChainPayoutAddress;
        newConfig.wattAllowance = _wattAllowance;
        newConfig.isStakedInPool = false;
        newConfig.createdAt = block.timestamp;
        newConfig.lastUpdated = block.timestamp;
        newConfig.isActive = true;
        
        // Add components and calculate stats
        uint256 totalHashPower = 0;
        uint256 totalWattConsumption = 0;
        
        for (uint256 i = 0; i < _componentTokenIds.length; i++) {
            ComponentConfig memory spec = componentSpecs[_componentTokenIds[i]];
            
            ComponentConfig memory component = ComponentConfig({
                tokenId: _componentTokenIds[i],
                quantity: _componentQuantities[i],
                hashPower: spec.hashPower * _componentQuantities[i],
                wattCost: spec.wattCost * _componentQuantities[i],
                name: spec.name,
                glbModel: spec.glbModel
            });
            
            newConfig.components.push(component);
            totalHashPower += component.hashPower;
            totalWattConsumption += component.wattCost;
        }
        
        // Apply Genesis Badge multiplier
        uint256 multiplier = 100; // Base 100%
        if (_genesisBadgeId > 0) {
            require(miningGameNFTs.balanceOf(msg.sender, _genesisBadgeId) > 0, "No Genesis Badge owned");
            multiplier = _getGenesisBadgeMultiplier(_genesisBadgeId);
        }
        
        newConfig.genesisBadgeMultiplier = multiplier;
        newConfig.totalHashPower = (totalHashPower * multiplier) / 100;
        newConfig.totalWattConsumption = totalWattConsumption;
        
        // Mint configuration NFT
        _safeMint(msg.sender, newConfigId);
        
        // Update mappings
        configExists[newConfigId] = true;
        ownerConfigs[msg.sender].push(newConfigId);
        
        emit MiningRigConfigCreated(
            newConfigId,
            msg.sender,
            _rigName,
            newConfig.totalHashPower,
            newConfig.totalWattConsumption
        );
        
        return newConfigId;
    }

    /**
     * @dev Stake mining rig configuration in a mining pool
     * @param _configId Configuration ID to stake
     * @param _poolOperator Pool operator address
     */
    function stakeInMiningPool(uint256 _configId, address _poolOperator) external nonReentrant {
        require(ownerOf(_configId) == msg.sender, "Not configuration owner");
        require(configExists[_configId], "Configuration does not exist");
        require(!miningRigConfigs[_configId].isStakedInPool, "Already staked in pool");
        
        MiningRigConfig storage config = miningRigConfigs[_configId];
        
        // Approve WATT consumption
        wattConsumptionApproval[_poolOperator][_configId] = true;
        
        // Update staking status
        config.isStakedInPool = true;
        config.stakedPoolAddress = _poolOperator;
        config.lastUpdated = block.timestamp;
        
        // Update miner's pool staking
        PoolStaking storage staking = minerPoolStaking[msg.sender];
        if (staking.poolOperator == address(0)) {
            staking.poolOperator = _poolOperator;
            staking.stakedAt = block.timestamp;
            staking.isActive = true;
        }
        
        staking.rigIds.push(_configId);
        staking.totalHashPower += config.totalHashPower;
        staking.totalWattConsumption += config.totalWattConsumption;
        
        emit RigStakedInPool(_configId, _poolOperator, config.totalHashPower, config.totalWattConsumption);
        emit WattConsumptionApproved(_configId, _poolOperator, config.wattAllowance);
    }

    /**
     * @dev Unstake mining rig configuration from mining pool
     * @param _configId Configuration ID to unstake
     */
    function unstakeFromMiningPool(uint256 _configId) external nonReentrant {
        require(ownerOf(_configId) == msg.sender, "Not configuration owner");
        require(miningRigConfigs[_configId].isStakedInPool, "Not staked in pool");
        
        MiningRigConfig storage config = miningRigConfigs[_configId];
        address poolOperator = config.stakedPoolAddress;
        
        // Remove WATT consumption approval
        wattConsumptionApproval[poolOperator][_configId] = false;
        
        // Update staking status
        config.isStakedInPool = false;
        config.stakedPoolAddress = address(0);
        config.lastUpdated = block.timestamp;
        
        // Update miner's pool staking
        PoolStaking storage staking = minerPoolStaking[msg.sender];
        staking.totalHashPower -= config.totalHashPower;
        staking.totalWattConsumption -= config.totalWattConsumption;
        
        // Remove from rig IDs array
        for (uint256 i = 0; i < staking.rigIds.length; i++) {
            if (staking.rigIds[i] == _configId) {
                staking.rigIds[i] = staking.rigIds[staking.rigIds.length - 1];
                staking.rigIds.pop();
                break;
            }
        }
        
        emit RigUnstakedFromPool(_configId, poolOperator);
    }

    /**
     * @dev Update mining rig configuration
     * @param _configId Configuration ID to update
     * @param _newRigName New rig name
     * @param _newNuChainAddress New nuChain payout address
     * @param _newWattAllowance New WATT allowance
     */
    function updateConfiguration(
        uint256 _configId,
        string calldata _newRigName,
        string calldata _newNuChainAddress,
        uint256 _newWattAllowance
    ) external {
        require(ownerOf(_configId) == msg.sender, "Not configuration owner");
        require(configExists[_configId], "Configuration does not exist");
        
        MiningRigConfig storage config = miningRigConfigs[_configId];
        config.rigName = _newRigName;
        config.nuChainPayoutAddress = _newNuChainAddress;
        config.wattAllowance = _newWattAllowance;
        config.lastUpdated = block.timestamp;
        
        emit ConfigurationUpdated(_configId, config.totalHashPower, config.totalWattConsumption);
    }

    /**
     * @dev Get mining rig configuration
     * @param _configId Configuration ID
     */
    function getConfiguration(uint256 _configId) external view returns (
        address owner,
        string memory rigName,
        string memory nuChainPayoutAddress,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        uint256 wattAllowance,
        bool isStakedInPool,
        address stakedPoolAddress
    ) {
        require(configExists[_configId], "Configuration does not exist");
        
        MiningRigConfig storage config = miningRigConfigs[_configId];
        return (
            config.owner,
            config.rigName,
            config.nuChainPayoutAddress,
            config.totalHashPower,
            config.totalWattConsumption,
            config.wattAllowance,
            config.isStakedInPool,
            config.stakedPoolAddress
        );
    }

    /**
     * @dev Get user's mining rig configurations
     * @param _owner Owner address
     */
    function getUserConfigurations(address _owner) external view returns (uint256[] memory) {
        return ownerConfigs[_owner];
    }

    // Internal functions
    function _validateRequiredComponents(uint256[] calldata tokenIds, uint256[] calldata quantities) internal pure {
        bool hasPCCase = false;
        bool hasXL1Processor = false;
        uint256 tx120Count = 0;
        uint256 gp50Count = 0;
        uint256 totalGPUs = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == 1) hasPCCase = true;
            if (tokenIds[i] == 3) hasXL1Processor = true;
            if (tokenIds[i] == 4) {
                tx120Count += quantities[i];
                totalGPUs += quantities[i];
            }
            if (tokenIds[i] == 5) {
                gp50Count += quantities[i];
                totalGPUs += quantities[i];
            }
        }
        
        require(hasPCCase, "PC Case (Token ID 1) is required");
        require(hasXL1Processor, "XL1 Processor (Token ID 3) is required");
        require(totalGPUs >= 1 && totalGPUs <= 2, "Must have 1-2 Graphics Cards");
        require(tx120Count <= 1, "Maximum 1 TX120 GPU allowed");
        require(gp50Count <= 2, "Maximum 2 GP50 GPUs allowed");
    }

    function _getGenesisBadgeMultiplier(uint256 _badgeId) internal pure returns (uint256) {
        // Genesis Badge multipliers based on rarity
        if (_badgeId <= 100) return 200; // 200% for ultra rare
        if (_badgeId <= 500) return 150; // 150% for rare
        if (_badgeId <= 2000) return 125; // 125% for uncommon
        return 110; // 110% for common
    }

    function _initializeComponentSpecs() internal {
        // PC Case (Token ID 1)
        componentSpecs[1] = ComponentConfig({
            tokenId: 1,
            quantity: 1,
            hashPower: 0,
            wattCost: 0,
            name: "Free Mint PC Case",
            glbModel: "/models/pc-case.glb"
        });
        
        // Genesis Badge (Token ID 2)
        componentSpecs[2] = ComponentConfig({
            tokenId: 2,
            quantity: 1,
            hashPower: 0, // Multiplier, not direct hash power
            wattCost: 0,
            name: "Genesis Badge",
            glbModel: "/models/genesis-badge.glb"
        });
        
        // XL1 Processor (Token ID 3)
        componentSpecs[3] = ComponentConfig({
            tokenId: 3,
            quantity: 1,
            hashPower: 500000, // 0.5 MH/s
            wattCost: 125, // 125W
            name: "XL1 Processor",
            glbModel: "/models/xl1-processor.glb"
        });
        
        // TX120 GPU (Token ID 4)
        componentSpecs[4] = ComponentConfig({
            tokenId: 4,
            quantity: 1,
            hashPower: 1500000, // 1.5 MH/s
            wattCost: 320, // 320W
            name: "TX120 GPU",
            glbModel: "/models/tx120-gpu.glb"
        });
        
        // GP50 GPU (Token ID 5)
        componentSpecs[5] = ComponentConfig({
            tokenId: 5,
            quantity: 1,
            hashPower: 2000000, // 2.0 MH/s
            wattCost: 450, // 450W
            name: "GP50 GPU",
            glbModel: "/models/gp50-gpu.glb"
        });
    }

    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}