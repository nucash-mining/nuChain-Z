// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MiningRigNFT
 * @dev NFT contract for mining rig configurations using Mining Game components
 * Each NFT represents a complete mining rig with combined stats and metadata
 */
contract MiningRigNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Mining Game NFT contract
    IERC1155 public immutable miningGameNFTs;
    
    // NFT counter
    Counters.Counter private _tokenIdCounter;
    
    struct ComponentConfig {
        uint256 tokenId;        // Mining Game NFT token ID
        uint256 quantity;       // Number of this component
        uint256 hashPower;      // Hash power contribution
        uint256 wattCost;       // WATT cost per block
        string name;            // Component name
    }
    
    struct MiningRigData {
        uint256 rigId;
        address owner;
        string rigName;
        string nuChainPayoutAddress;
        ComponentConfig[] components;
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        uint256 wattAllowance;
        uint256 genesisBadgeMultiplier; // 100-200% multiplier
        uint256 efficiency;             // Hash power per watt
        bool isStakedInPool;
        address stakedPoolAddress;
        uint256 createdAt;
        uint256 lastUpdated;
        string metadataURI;
    }
    
    // Storage
    mapping(uint256 => MiningRigData) public miningRigs;
    mapping(address => uint256[]) public ownerRigs;
    mapping(uint256 => bool) public rigExists;
    
    // Component specifications
    mapping(uint256 => ComponentConfig) public componentSpecs;
    
    // Events
    event MiningRigCreated(
        uint256 indexed rigId,
        address indexed owner,
        string rigName,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        uint256 efficiency
    );
    
    event RigStakedInPool(
        uint256 indexed rigId,
        address indexed poolAddress,
        uint256 hashPower,
        uint256 wattConsumption
    );
    
    event RigUnstakedFromPool(
        uint256 indexed rigId,
        address indexed poolAddress
    );
    
    event RigConfigurationUpdated(
        uint256 indexed rigId,
        uint256 newHashPower,
        uint256 newWattConsumption,
        uint256 newEfficiency
    );

    constructor(
        address _miningGameNFTs,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        require(_miningGameNFTs != address(0), "Invalid Mining Game NFTs address");
        miningGameNFTs = IERC1155(_miningGameNFTs);
        _initializeComponentSpecs();
    }

    /**
     * @dev Create a new mining rig configuration NFT
     * @param _rigName Name of the mining rig
     * @param _nuChainPayoutAddress nuChain address for rewards
     * @param _componentTokenIds Array of Mining Game NFT token IDs
     * @param _componentQuantities Array of component quantities
     * @param _wattAllowance WATT tokens allowed for consumption
     * @param _metadataURI IPFS URI for NFT metadata
     */
    function createMiningRig(
        string calldata _rigName,
        string calldata _nuChainPayoutAddress,
        uint256[] calldata _componentTokenIds,
        uint256[] calldata _componentQuantities,
        uint256 _wattAllowance,
        string calldata _metadataURI
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
        
        _tokenIdCounter.increment();
        uint256 newRigId = _tokenIdCounter.current();
        
        // Create rig configuration
        MiningRigData storage newRig = miningRigs[newRigId];
        newRig.rigId = newRigId;
        newRig.owner = msg.sender;
        newRig.rigName = _rigName;
        newRig.nuChainPayoutAddress = _nuChainPayoutAddress;
        newRig.wattAllowance = _wattAllowance;
        newRig.isStakedInPool = false;
        newRig.createdAt = block.timestamp;
        newRig.lastUpdated = block.timestamp;
        newRig.metadataURI = _metadataURI;
        
        // Add components and calculate stats
        uint256 totalHashPower = 0;
        uint256 totalWattConsumption = 0;
        uint256 genesisBadgeMultiplier = 100; // Base 100%
        
        for (uint256 i = 0; i < _componentTokenIds.length; i++) {
            ComponentConfig memory spec = componentSpecs[_componentTokenIds[i]];
            
            ComponentConfig memory component = ComponentConfig({
                tokenId: _componentTokenIds[i],
                quantity: _componentQuantities[i],
                hashPower: spec.hashPower * _componentQuantities[i],
                wattCost: spec.wattCost * _componentQuantities[i],
                name: spec.name
            });
            
            newRig.components.push(component);
            totalHashPower += component.hashPower;
            totalWattConsumption += component.wattCost;
            
            // Check for Genesis Badge
            if (_componentTokenIds[i] == 2 && _componentQuantities[i] > 0) {
                genesisBadgeMultiplier = 150; // 150% multiplier
            }
        }
        
        // Apply Genesis Badge multiplier
        newRig.genesisBadgeMultiplier = genesisBadgeMultiplier;
        newRig.totalHashPower = (totalHashPower * genesisBadgeMultiplier) / 100;
        newRig.totalWattConsumption = totalWattConsumption;
        newRig.efficiency = totalWattConsumption > 0 ? (newRig.totalHashPower * 100) / totalWattConsumption : 0;
        
        // Mint NFT
        _safeMint(msg.sender, newRigId);
        _setTokenURI(newRigId, _metadataURI);
        
        // Update mappings
        rigExists[newRigId] = true;
        ownerRigs[msg.sender].push(newRigId);
        
        emit MiningRigCreated(
            newRigId,
            msg.sender,
            _rigName,
            newRig.totalHashPower,
            newRig.totalWattConsumption,
            newRig.efficiency
        );
        
        return newRigId;
    }

    /**
     * @dev Stake mining rig in a mining pool
     * @param _rigId Mining rig NFT ID
     * @param _poolAddress Mining pool contract address
     */
    function stakeInMiningPool(uint256 _rigId, address _poolAddress) external nonReentrant {
        require(ownerOf(_rigId) == msg.sender, "Not rig owner");
        require(rigExists[_rigId], "Rig does not exist");
        require(!miningRigs[_rigId].isStakedInPool, "Already staked");
        
        MiningRigData storage rig = miningRigs[_rigId];
        rig.isStakedInPool = true;
        rig.stakedPoolAddress = _poolAddress;
        rig.lastUpdated = block.timestamp;
        
        emit RigStakedInPool(_rigId, _poolAddress, rig.totalHashPower, rig.totalWattConsumption);
    }

    /**
     * @dev Unstake mining rig from mining pool
     * @param _rigId Mining rig NFT ID
     */
    function unstakeFromMiningPool(uint256 _rigId) external nonReentrant {
        require(ownerOf(_rigId) == msg.sender, "Not rig owner");
        require(miningRigs[_rigId].isStakedInPool, "Not staked");
        
        MiningRigData storage rig = miningRigs[_rigId];
        address poolAddress = rig.stakedPoolAddress;
        
        rig.isStakedInPool = false;
        rig.stakedPoolAddress = address(0);
        rig.lastUpdated = block.timestamp;
        
        emit RigUnstakedFromPool(_rigId, poolAddress);
    }

    /**
     * @dev Update mining rig configuration
     * @param _rigId Mining rig NFT ID
     * @param _newRigName New rig name
     * @param _newNuChainAddress New nuChain payout address
     * @param _newWattAllowance New WATT allowance
     * @param _newMetadataURI New metadata URI
     */
    function updateRigConfiguration(
        uint256 _rigId,
        string calldata _newRigName,
        string calldata _newNuChainAddress,
        uint256 _newWattAllowance,
        string calldata _newMetadataURI
    ) external {
        require(ownerOf(_rigId) == msg.sender, "Not rig owner");
        require(rigExists[_rigId], "Rig does not exist");
        
        MiningRigData storage rig = miningRigs[_rigId];
        rig.rigName = _newRigName;
        rig.nuChainPayoutAddress = _newNuChainAddress;
        rig.wattAllowance = _newWattAllowance;
        rig.lastUpdated = block.timestamp;
        
        if (bytes(_newMetadataURI).length > 0) {
            rig.metadataURI = _newMetadataURI;
            _setTokenURI(_rigId, _newMetadataURI);
        }
        
        emit RigConfigurationUpdated(_rigId, rig.totalHashPower, rig.totalWattConsumption, rig.efficiency);
    }

    /**
     * @dev Get mining rig configuration
     * @param _rigId Mining rig NFT ID
     */
    function getMiningRig(uint256 _rigId) external view returns (
        address owner,
        string memory rigName,
        string memory nuChainPayoutAddress,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        uint256 efficiency,
        uint256 genesisBadgeMultiplier,
        bool isStakedInPool,
        address stakedPoolAddress
    ) {
        require(rigExists[_rigId], "Rig does not exist");
        
        MiningRigData storage rig = miningRigs[_rigId];
        return (
            rig.owner,
            rig.rigName,
            rig.nuChainPayoutAddress,
            rig.totalHashPower,
            rig.totalWattConsumption,
            rig.efficiency,
            rig.genesisBadgeMultiplier,
            rig.isStakedInPool,
            rig.stakedPoolAddress
        );
    }

    /**
     * @dev Get user's mining rigs
     * @param _owner Owner address
     */
    function getUserRigs(address _owner) external view returns (uint256[] memory) {
        return ownerRigs[_owner];
    }

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

    function _initializeComponentSpecs() internal {
        // PC Case (Token ID 1) - Free Mint
        componentSpecs[1] = ComponentConfig({
            tokenId: 1,
            quantity: 1,
            hashPower: 0,
            wattCost: 0,
            name: "Free Mint Gaming PC"
        });
        
        // Genesis Badge (Token ID 2)
        componentSpecs[2] = ComponentConfig({
            tokenId: 2,
            quantity: 1,
            hashPower: 0, // Multiplier, not direct hash power
            wattCost: 0,
            name: "Genesis Badge"
        });
        
        // XL1 Processor (Token ID 3)
        componentSpecs[3] = ComponentConfig({
            tokenId: 3,
            quantity: 1,
            hashPower: 500000, // 0.5 MH/s
            wattCost: 125, // 125W
            name: "XL1 Processor"
        });
        
        // TX120 GPU (Token ID 4)
        componentSpecs[4] = ComponentConfig({
            tokenId: 4,
            quantity: 1,
            hashPower: 1500000, // 1.5 MH/s
            wattCost: 320, // 320W
            name: "TX120 GPU"
        });
        
        // GP50 GPU (Token ID 5)
        componentSpecs[5] = ComponentConfig({
            tokenId: 5,
            quantity: 1,
            hashPower: 2000000, // 2.0 MH/s
            wattCost: 450, // 450W
            name: "GP50 GPU"
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

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}