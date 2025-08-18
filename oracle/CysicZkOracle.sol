// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title CysicZkOracle
 * @dev Oracle contract for Mining Game NFT data aggregation and zk-proof verification
 * Relays hashpower/WATT consumption data from Altcoinchain/Polygon to nuChain
 */
contract CysicZkOracle is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;

    // Mining Game contracts
    IERC1155 public immutable miningGameNFTs;
    IERC20 public immutable wattToken;
    
    // Cysic zk-proof verification
    address public cysicVerifier;
    
    // Oracle state
    mapping(bytes32 => bool) public processedProofs;
    mapping(address => MinerData) public miners;
    mapping(uint256 => ComponentData) public componentRegistry;
    
    struct MinerData {
        address minerAddress;
        uint256[] rigIds;
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        string nuChainAddress;
        uint256 lastProofSubmission;
        bool isActive;
    }
    
    struct ComponentData {
        uint256 tokenId;
        uint256 hashPower;
        uint256 wattCost;
        string name;
        bool isActive;
    }
    
    struct ZkProofData {
        bytes32 proofHash;
        address miner;
        uint256[] rigIds;
        uint256 totalHashPower;
        uint256 totalWattConsumption;
        uint256 blockHeight;
        uint256 timestamp;
        bytes cysicProof;
        bytes publicInputs;
    }
    
    // Events
    event MinerRegistered(
        address indexed miner,
        uint256[] rigIds,
        uint256 totalHashPower,
        string nuChainAddress
    );
    
    event ZkProofSubmitted(
        bytes32 indexed proofHash,
        address indexed miner,
        uint256 totalHashPower,
        uint256 blockHeight
    );
    
    event BlockRewardCalculated(
        address indexed miner,
        uint256 hashPowerShare,
        uint256 nuReward,
        uint256 wattCost
    );
    
    event CrossChainRelay(
        string targetChain,
        bytes payload,
        uint256 timestamp
    );

    constructor(
        address _miningGameNFTs,
        address _wattToken,
        address _cysicVerifier
    ) {
        require(_miningGameNFTs != address(0), "Invalid Mining Game NFTs");
        require(_wattToken != address(0), "Invalid WATT token");
        require(_cysicVerifier != address(0), "Invalid Cysic verifier");
        
        miningGameNFTs = IERC1155(_miningGameNFTs);
        wattToken = IERC20(_wattToken);
        cysicVerifier = _cysicVerifier;
        
        _initializeComponents();
    }

    /**
     * @dev Register miner with Mining Game NFT rigs
     * @param _rigIds Array of Mining Game NFT token IDs
     * @param _nuChainAddress Cosmos address for NU token rewards
     */
    function registerMiner(
        uint256[] calldata _rigIds,
        string calldata _nuChainAddress
    ) external nonReentrant {
        require(_rigIds.length > 0, "No rigs provided");
        require(bytes(_nuChainAddress).length > 0, "nuChain address required");
        
        uint256 totalHashPower = 0;
        uint256 totalWattConsumption = 0;
        
        // Verify NFT ownership and calculate stats
        for (uint256 i = 0; i < _rigIds.length; i++) {
            require(miningGameNFTs.balanceOf(msg.sender, _rigIds[i]) > 0, "NFT not owned");
            
            ComponentData memory component = componentRegistry[_rigIds[i]];
            totalHashPower += component.hashPower;
            totalWattConsumption += component.wattCost;
        }
        
        // Register miner
        miners[msg.sender] = MinerData({
            minerAddress: msg.sender,
            rigIds: _rigIds,
            totalHashPower: totalHashPower,
            totalWattConsumption: totalWattConsumption,
            nuChainAddress: _nuChainAddress,
            lastProofSubmission: block.timestamp,
            isActive: true
        });
        
        emit MinerRegistered(msg.sender, _rigIds, totalHashPower, _nuChainAddress);
    }

    /**
     * @dev Submit Cysic zk-proof for mining block reward
     * @param _cysicProof Cysic-generated zk-SNARK proof
     * @param _publicInputs Public inputs for proof verification
     * @param _blockHeight Target block height for mining
     */
    function submitCysicProof(
        bytes calldata _cysicProof,
        bytes calldata _publicInputs,
        uint256 _blockHeight
    ) external nonReentrant {
        require(miners[msg.sender].isActive, "Miner not registered");
        require(_cysicProof.length > 0, "Cysic proof required");
        
        // Generate proof hash
        bytes32 proofHash = keccak256(abi.encodePacked(
            msg.sender,
            _blockHeight,
            _cysicProof,
            block.timestamp
        ));
        
        require(!processedProofs[proofHash], "Proof already processed");
        
        // Verify Cysic zk-proof
        require(_verifyCysicProof(_cysicProof, _publicInputs), "Invalid Cysic proof");
        
        // Create proof data
        ZkProofData memory proofData = ZkProofData({
            proofHash: proofHash,
            miner: msg.sender,
            rigIds: miners[msg.sender].rigIds,
            totalHashPower: miners[msg.sender].totalHashPower,
            totalWattConsumption: miners[msg.sender].totalWattConsumption,
            blockHeight: _blockHeight,
            timestamp: block.timestamp,
            cysicProof: _cysicProof,
            publicInputs: _publicInputs
        });
        
        // Mark proof as processed
        processedProofs[proofHash] = true;
        miners[msg.sender].lastProofSubmission = block.timestamp;
        
        emit ZkProofSubmitted(proofHash, msg.sender, miners[msg.sender].totalHashPower, _blockHeight);
        
        // Calculate and relay block reward
        _calculateBlockReward(proofData);
    }

    /**
     * @dev Calculate block reward and relay to nuChain
     */
    function _calculateBlockReward(ZkProofData memory proofData) internal {
        MinerData memory miner = miners[proofData.miner];
        
        // Calculate hash power percentage of total network
        uint256 networkHashPower = _getTotalNetworkHashPower();
        uint256 hashPowerShare = networkHashPower > 0 
            ? (miner.totalHashPower * 10000) / networkHashPower  // Basis points
            : 10000; // 100% if only miner
        
        // Base NU reward: 0.05 NU per block
        uint256 baseReward = 50000000000000000; // 0.05 NU * 10^18
        uint256 nuReward = (baseReward * hashPowerShare) / 10000;
        
        emit BlockRewardCalculated(
            proofData.miner,
            hashPowerShare,
            nuReward,
            miner.totalWattConsumption
        );
        
        // Relay to nuChain
        _relayToNuChain(proofData, nuReward);
    }

    /**
     * @dev Relay mining data to nuChain via LayerZero
     */
    function _relayToNuChain(ZkProofData memory proofData, uint256 nuReward) internal {
        MinerData memory miner = miners[proofData.miner];
        
        // Create cross-chain payload
        bytes memory payload = abi.encode(
            "mining_block_reward",
            proofData.miner,
            miner.nuChainAddress,
            nuReward,
            miner.totalHashPower,
            miner.totalWattConsumption,
            proofData.blockHeight,
            proofData.timestamp,
            proofData.cysicProof
        );
        
        emit CrossChainRelay("nuchain-1", payload, block.timestamp);
        
        // In production, this would call LayerZero endpoint
        // _lzSend(nuChainId, payload, payable(msg.sender), address(0), bytes(""), msg.value);
    }

    /**
     * @dev Verify Cysic zk-SNARK proof
     */
    function _verifyCysicProof(bytes calldata proof, bytes calldata publicInputs) internal view returns (bool) {
        // Call Cysic verifier contract
        (bool success, bytes memory result) = cysicVerifier.staticcall(
            abi.encodeWithSignature("verifyProof(bytes,bytes)", proof, publicInputs)
        );
        
        if (!success) return false;
        return abi.decode(result, (bool));
    }

    /**
     * @dev Get total network hash power
     */
    function _getTotalNetworkHashPower() internal view returns (uint256) {
        // This would aggregate all active miners' hash power
        // For now, return a placeholder
        return 10000000; // 10 MH/s network
    }

    /**
     * @dev Initialize component registry with Mining Game NFT data
     */
    function _initializeComponents() internal {
        // PC Case (Token ID 1)
        componentRegistry[1] = ComponentData({
            tokenId: 1,
            hashPower: 0,
            wattCost: 0,
            name: "Free Mint PC Case",
            isActive: true
        });
        
        // Genesis Badge (Token ID 2)
        componentRegistry[2] = ComponentData({
            tokenId: 2,
            hashPower: 0, // Multiplier effect
            wattCost: 0,
            name: "Genesis Badge",
            isActive: true
        });
        
        // XL1 Processor (Token ID 3)
        componentRegistry[3] = ComponentData({
            tokenId: 3,
            hashPower: 500000, // 0.5 MH/s
            wattCost: 125, // 125W
            name: "XL1 Processor",
            isActive: true
        });
        
        // TX120 GPU (Token ID 4)
        componentRegistry[4] = ComponentData({
            tokenId: 4,
            hashPower: 1500000, // 1.5 MH/s
            wattCost: 320, // 320W
            name: "TX120 GPU",
            isActive: true
        });
        
        // GP50 GPU (Token ID 5)
        componentRegistry[5] = ComponentData({
            tokenId: 5,
            hashPower: 2000000, // 2.0 MH/s
            wattCost: 450, // 450W
            name: "GP50 GPU",
            isActive: true
        });
    }

    /**
     * @dev Update Cysic verifier address
     */
    function updateCysicVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier address");
        cysicVerifier = _newVerifier;
    }

    /**
     * @dev Get miner data
     */
    function getMiner(address _miner) external view returns (
        uint256[] memory rigIds,
        uint256 totalHashPower,
        uint256 totalWattConsumption,
        string memory nuChainAddress,
        bool isActive
    ) {
        MinerData memory miner = miners[_miner];
        return (
            miner.rigIds,
            miner.totalHashPower,
            miner.totalWattConsumption,
            miner.nuChainAddress,
            miner.isActive
        );
    }
}