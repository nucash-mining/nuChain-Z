// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NFTMiningRig
 * @dev Mining rig configuration contract using Mining Game NFT components
 * Deployed on both Altcoinchain and Polygon for cross-chain mining operations
 */
contract NFTMiningRig is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // WATT token contracts (different addresses for Altcoinchain vs Polygon)
    IERC20 public immutable wattToken;
    
    // Genesis Badge NFT contract for multipliers
    IERC721 public immutable genesisBadgeNFT;
    
    // Mining Game component contracts
    mapping(address => bool) public approvedComponentContracts;
    
    // NFT counter
    Counters.Counter private _tokenIdCounter;
    
    // Component types from Mining Game
    enum ComponentType {
        CPU,
        GPU,
        MEMORY,
        STORAGE,
        MOTHERBOARD,
        PSU,
        COOLING,
        CASE
    }
    
    struct ComponentData {
        address contractAddress;    // Mining Game NFT contract
        uint256 tokenId;           // Component NFT token ID
        ComponentType componentType;
        uint256 hashPower;         // Computed hash power
        uint256 wattConsumption;   // WATT tokens per block
        string name;               // Component name
        string glbFile;            // 3D model file path
        bool isActive;
    }
    
    struct MiningRig {
        uint256 rigId;
        address owner;
        ComponentData[] components;
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        uint256 genesisBadgeMultiplier; // From Genesis Badge NFT
        bool isPoweredOn;
        uint256 createdAt;
        uint256 lastUpdated;
    }
    
    // Storage
    mapping(uint256 => MiningRig) public miningRigs;
    mapping(address => uint256[]) public ownerRigs;
    mapping(uint256 => bool) public rigExists;
    
    // Component hash power calculations
    mapping(ComponentType => mapping(string => uint256)) public componentHashPower;
    mapping(ComponentType => mapping(string => uint256)) public componentWattCost;
    
    // Events
    event MiningRigCreated(
        uint256 indexed rigId,
        address indexed owner,
        uint256 totalHashPower,
        uint256 totalWattConsumption
    );
    
    event MiningRigUpdated(
        uint256 indexed rigId,
        uint256 newHashPower,
        uint256 newWattConsumption
    );
    
    event MiningRigPowerToggled(
        uint256 indexed rigId,
        bool isPoweredOn
    );
    
    event ComponentAdded(
        uint256 indexed rigId,
        address componentContract,
        uint256 componentTokenId,
        ComponentType componentType
    );

    constructor(
        address _wattToken,
        address _genesisBadgeNFT,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        require(_wattToken != address(0), "Invalid WATT token address");
        require(_genesisBadgeNFT != address(0), "Invalid Genesis Badge address");
        
        wattToken = IERC20(_wattToken);
        genesisBadgeNFT = IERC721(_genesisBadgeNFT);
        
        // Initialize component hash power values
        _initializeComponentValues();
    }

    /**
     * @dev Create a new mining rig from Mining Game NFT components
     * @param _componentContracts Array of Mining Game NFT contract addresses
     * @param _componentTokenIds Array of component NFT token IDs
     * @param _genesisBadgeId Genesis Badge NFT ID for multiplier (0 if none)
     */
    function createMiningRig(
        address[] calldata _componentContracts,
        uint256[] calldata _componentTokenIds,
        uint256 _genesisBadgeId
    ) external nonReentrant returns (uint256) {
        require(_componentContracts.length == _componentTokenIds.length, "Array length mismatch");
        require(_componentContracts.length > 0, "No components provided");
        require(_componentContracts.length <= 8, "Too many components");

        // Validate required components
        bool hasPCCase = false;
        bool hasXL1Processor = false;
        uint256 tx120Count = 0;
        uint256 gp50Count = 0;
        uint256 totalGPUs = 0;
        
        for (uint256 i = 0; i < _componentTokenIds.length; i++) {
            if (_componentTokenIds[i] == 1) hasPCCase = true;
            if (_componentTokenIds[i] == 3) hasXL1Processor = true;
            if (_componentTokenIds[i] == 4) {
                tx120Count++;
                totalGPUs++;
            }
            if (_componentTokenIds[i] == 5) {
                gp50Count++;
                totalGPUs++;
            }
        }
        
        require(hasPCCase, "PC Case (Token ID 1) is required");
        require(hasXL1Processor, "XL1 Processor (Token ID 3) is required");
        require(totalGPUs >= 1 && totalGPUs <= 2, "Must have 1-2 Graphics Cards");
        require(tx120Count <= 1, "Maximum 1 TX120 GPU allowed");
        require(gp50Count <= 1, "Maximum 1 GP50 GPU allowed");
        // Verify Genesis Badge ownership if provided
        uint256 multiplier = 100; // Base 100% (no multiplier)
        if (_genesisBadgeId > 0) {
            require(genesisBadgeNFT.ownerOf(_genesisBadgeId) == msg.sender, "Not Genesis Badge owner");
            multiplier = _getGenesisBadgeMultiplier(_genesisBadgeId);
        }

        _tokenIdCounter.increment();
        uint256 newRigId = _tokenIdCounter.current();

        // Create mining rig
        MiningRig storage newRig = miningRigs[newRigId];
        newRig.rigId = newRigId;
        newRig.owner = msg.sender;
        newRig.genesisBadgeMultiplier = multiplier;
        newRig.isPoweredOn = false;
        newRig.createdAt = block.timestamp;
        newRig.lastUpdated = block.timestamp;

        // Add components and calculate total stats
        uint256 totalHashPower = 0;
        uint256 totalWattConsumption = 0;

        for (uint256 i = 0; i < _componentContracts.length; i++) {
            require(approvedComponentContracts[_componentContracts[i]], "Component contract not approved");
            
            // Verify component ownership
            IERC721 componentContract = IERC721(_componentContracts[i]);
            require(componentContract.ownerOf(_componentTokenIds[i]) == msg.sender, "Not component owner");

            // Get component data
            ComponentData memory component = _getComponentData(
                _componentContracts[i],
                _componentTokenIds[i]
            );

            newRig.components.push(component);
            totalHashPower += component.hashPower;
            totalWattConsumption += component.wattConsumption;

            emit ComponentAdded(newRigId, _componentContracts[i], _componentTokenIds[i], component.componentType);
        }

        // Apply Genesis Badge multiplier to hash power
        totalHashPower = (totalHashPower * multiplier) / 100;

        newRig.totalHashPower = totalHashPower;
        newRig.totalWattConsumption = totalWattConsumption;

        // Mint NFT
        _safeMint(msg.sender, newRigId);
        
        // Update mappings
        rigExists[newRigId] = true;
        ownerRigs[msg.sender].push(newRigId);

        emit MiningRigCreated(newRigId, msg.sender, totalHashPower, totalWattConsumption);

        return newRigId;
    }

    /**
     * @dev Power on/off mining rig (affects WATT consumption)
     * @param _rigId Mining rig NFT ID
     * @param _powerOn True to power on, false to power off
     */
    function toggleRigPower(uint256 _rigId, bool _powerOn) external {
        require(ownerOf(_rigId) == msg.sender, "Not rig owner");
        require(rigExists[_rigId], "Rig does not exist");

        MiningRig storage rig = miningRigs[_rigId];
        rig.isPoweredOn = _powerOn;
        rig.lastUpdated = block.timestamp;

        emit MiningRigPowerToggled(_rigId, _powerOn);
    }

    /**
     * @dev Get mining rig configuration data
     * @param _rigId Mining rig NFT ID
     */
    function getMiningRig(uint256 _rigId) external view returns (
        address owner,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        uint256 genesisBadgeMultiplier,
        bool isPoweredOn,
        uint256 componentCount
    ) {
        require(rigExists[_rigId], "Rig does not exist");
        
        MiningRig storage rig = miningRigs[_rigId];
        return (
            rig.owner,
            rig.totalHashPower,
            rig.totalWattConsumption,
            rig.genesisBadgeMultiplier,
            rig.isPoweredOn,
            rig.components.length
        );
    }

    /**
     * @dev Get mining rig components
     * @param _rigId Mining rig NFT ID
     */
    function getRigComponents(uint256 _rigId) external view returns (ComponentData[] memory) {
        require(rigExists[_rigId], "Rig does not exist");
        return miningRigs[_rigId].components;
    }

    /**
     * @dev Get user's mining rigs
     * @param _owner Owner address
     */
    function getUserRigs(address _owner) external view returns (uint256[] memory) {
        return ownerRigs[_owner];
    }

    /**
     * @dev Add approved component contract
     * @param _contract Mining Game NFT contract address
     */
    function addApprovedComponentContract(address _contract) external onlyOwner {
        approvedComponentContracts[_contract] = true;
    }

    /**
     * @dev Remove approved component contract
     * @param _contract Mining Game NFT contract address
     */
    function removeApprovedComponentContract(address _contract) external onlyOwner {
        approvedComponentContracts[_contract] = false;
    }

    /**
     * @dev Set component hash power values
     * @param _componentType Component type
     * @param _name Component name
     * @param _hashPower Hash power value
     * @param _wattCost WATT cost per block
     */
    function setComponentValues(
        ComponentType _componentType,
        string calldata _name,
        uint256 _hashPower,
        uint256 _wattCost
    ) external onlyOwner {
        componentHashPower[_componentType][_name] = _hashPower;
        componentWattCost[_componentType][_name] = _wattCost;
    }

    // Internal functions
    function _getComponentData(
        address _contractAddress,
        uint256 _tokenId
    ) internal pure returns (ComponentData memory) {
        // Real component data based on Mining Game contracts
        // Altcoinchain: 0xf9670e5D46834561813CA79854B3d7147BBbFfb2
        // Polygon: 0x970a8b10147e3459d3cbf56329b76ac18d329728
        
        ComponentData memory component;
        component.contractAddress = _contractAddress;
        component.tokenId = _tokenId;
        component.isActive = true;
        
        // Map token IDs to actual Mining Game components (same IDs on both chains)
        if (_tokenId == 1) { // PC Case
            component.componentType = ComponentType.CASE;
            component.hashPower = 0;
            component.wattConsumption = 0;
            component.name = "Free Mint PC Case";
            component.glbFile = "/models/pc-case.glb";
        } else if (_tokenId == 2) { // Genesis Badge
            component.componentType = ComponentType.CASE; // Special boost item
            component.hashPower = 0; // Multiplier, not direct hash power
            component.wattConsumption = 0;
            component.name = "Genesis Badge";
            component.glbFile = "/models/genesis-badge.glb";
        } else if (_tokenId == 3) { // XL1 Processor
            component.componentType = ComponentType.CPU;
            component.hashPower = 500000; // 0.5 MH/s base
            component.wattConsumption = 125; // 125W
            component.name = "XL1 Processor";
            component.glbFile = "/models/xl1-processor.glb";
        } else if (_tokenId == 4) { // TX120 GPU
            component.componentType = ComponentType.GPU;
            component.hashPower = 1500000; // 1.5 MH/s
            component.wattConsumption = 320; // 320W
            component.name = "TX120 GPU";
            component.glbFile = "/models/tx120-gpu.glb";
        } else if (_tokenId == 5) { // GP50 GPU
            component.componentType = ComponentType.GPU;
            component.hashPower = 2000000; // 2.0 MH/s
            component.wattConsumption = 450; // 450W
            component.name = "GP50 GPU";
            component.glbFile = "/models/gp50-gpu.glb";
        } else {
            // Default component
            component.componentType = ComponentType.CASE;
            component.hashPower = 0;
            component.wattConsumption = 0;
            component.name = "Unknown Component";
            component.glbFile = "/models/default.glb";
        }
        
        return component;
    }

    function _getGenesisBadgeMultiplier(uint256 _badgeId) internal pure returns (uint256) {
        // Genesis Badge multipliers based on rarity
        // This would be determined from the actual Genesis Badge contract
        if (_badgeId <= 100) return 200; // 200% for ultra rare
        if (_badgeId <= 500) return 150; // 150% for rare
        if (_badgeId <= 2000) return 125; // 125% for uncommon
        return 110; // 110% for common
    }

    function _initializeComponentValues() internal {
        // Initialize GPU hash power values
        componentHashPower[ComponentType.GPU]["RTX 4090"] = 2000000;
        componentHashPower[ComponentType.GPU]["RTX 4080"] = 1500000;
        componentHashPower[ComponentType.GPU]["RTX 3090"] = 1200000;
        componentHashPower[ComponentType.GPU]["RTX 3080"] = 1000000;
        
        // Initialize GPU WATT costs
        componentWattCost[ComponentType.GPU]["RTX 4090"] = 450;
        componentWattCost[ComponentType.GPU]["RTX 4080"] = 320;
        componentWattCost[ComponentType.GPU]["RTX 3090"] = 350;
        componentWattCost[ComponentType.GPU]["RTX 3080"] = 320;
        
        // Initialize CPU values
        componentHashPower[ComponentType.CPU]["Intel i9-13900K"] = 500000;
        componentHashPower[ComponentType.CPU]["AMD Ryzen 9 7950X"] = 480000;
        componentWattCost[ComponentType.CPU]["Intel i9-13900K"] = 125;
        componentWattCost[ComponentType.CPU]["AMD Ryzen 9 7950X"] = 120;
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