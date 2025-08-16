// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LayerZeroIntegration
 * @dev Cross-chain bridge contract for Z Blockchain ↔ nuChain communication
 * Handles token bridging, message passing, and cross-chain transactions
 */
contract LayerZeroIntegration is NonblockingLzApp, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Supported tokens
    IERC20 public immutable zToken;
    IERC20 public immutable nuToken;
    
    // Chain configurations
    mapping(uint16 => bool) public supportedChains;
    mapping(uint16 => bytes) public trustedRemoteLookup;
    
    // Bridge state
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public lockedBalances;
    
    // Events
    event BridgeInitiated(
        address indexed user,
        uint16 indexed dstChainId,
        address token,
        uint256 amount,
        bytes32 messageHash
    );
    
    event BridgeCompleted(
        address indexed user,
        address token,
        uint256 amount,
        bytes32 messageHash
    );
    
    event TokensLocked(address indexed user, address token, uint256 amount);
    event TokensReleased(address indexed user, address token, uint256 amount);
    
    // Message types
    uint8 constant BRIDGE_MESSAGE = 1;
    uint8 constant MINING_REWARD = 2;
    uint8 constant CROSS_CHAIN_TX = 3;

    /**
     * @dev Constructor
     * @param _endpoint LayerZero endpoint address
     * @param _zToken Z token contract address
     * @param _nuToken NU token contract address
     */
    constructor(
        address _endpoint,
        address _zToken,
        address _nuToken
    ) NonblockingLzApp(_endpoint) {
        require(_zToken != address(0), "Invalid Z token address");
        require(_nuToken != address(0), "Invalid NU token address");
        
        zToken = IERC20(_zToken);
        nuToken = IERC20(_nuToken);
    }

    /**
     * @dev Bridge tokens to destination chain
     * @param _dstChainId Destination chain ID
     * @param _token Token address to bridge
     * @param _amount Amount to bridge
     * @param _recipient Recipient address on destination chain
     * @param _memo Optional memo for the transfer
     */
    function bridgeTokens(
        uint16 _dstChainId,
        address _token,
        uint256 _amount,
        address _recipient,
        string calldata _memo
    ) external payable nonReentrant {
        require(supportedChains[_dstChainId], "Unsupported destination chain");
        require(_token == address(zToken) || _token == address(nuToken), "Unsupported token");
        require(_amount > 0, "Amount must be greater than 0");
        require(_recipient != address(0), "Invalid recipient");

        // Lock tokens
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        lockedBalances[msg.sender] += _amount;
        
        emit TokensLocked(msg.sender, _token, _amount);

        // Prepare cross-chain message
        bytes memory payload = abi.encode(
            BRIDGE_MESSAGE,
            msg.sender,
            _recipient,
            _token,
            _amount,
            _memo,
            block.timestamp
        );
        
        bytes32 messageHash = keccak256(payload);
        
        // Send LayerZero message
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(0),
            bytes(""),
            msg.value
        );
        
        emit BridgeInitiated(msg.sender, _dstChainId, _token, _amount, messageHash);
    }

    /**
     * @dev Send mining reward notification cross-chain
     * @param _dstChainId Destination chain ID
     * @param _miner Miner address
     * @param _reward Reward amount
     * @param _blockHeight Block height where mining occurred
     */
    function sendMiningReward(
        uint16 _dstChainId,
        address _miner,
        uint256 _reward,
        uint256 _blockHeight
    ) external payable onlyOwner {
        bytes memory payload = abi.encode(
            MINING_REWARD,
            _miner,
            _reward,
            _blockHeight,
            block.timestamp
        );
        
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(0),
            bytes(""),
            msg.value
        );
    }

    /**
     * @dev Send cross-chain transaction
     * @param _dstChainId Destination chain ID
     * @param _recipient Recipient address
     * @param _data Transaction data
     */
    function sendCrossChainTransaction(
        uint16 _dstChainId,
        address _recipient,
        bytes calldata _data
    ) external payable {
        bytes memory payload = abi.encode(
            CROSS_CHAIN_TX,
            msg.sender,
            _recipient,
            _data,
            block.timestamp
        );
        
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(0),
            bytes(""),
            msg.value
        );
    }

    /**
     * @dev Process incoming LayerZero message
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @param _payload Message payload
     */
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64, // nonce
        bytes memory _payload
    ) internal override {
        bytes32 messageHash = keccak256(_payload);
        require(!processedMessages[messageHash], "Message already processed");
        processedMessages[messageHash] = true;

        uint8 messageType = abi.decode(_payload, (uint8));
        
        if (messageType == BRIDGE_MESSAGE) {
            _processBridgeMessage(_srcChainId, _payload, messageHash);
        } else if (messageType == MINING_REWARD) {
            _processMiningReward(_payload);
        } else if (messageType == CROSS_CHAIN_TX) {
            _processCrossChainTransaction(_payload);
        }
    }

    /**
     * @dev Process bridge message
     */
    function _processBridgeMessage(
        uint16 _srcChainId,
        bytes memory _payload,
        bytes32 _messageHash
    ) internal {
        (
            ,
            address sender,
            address recipient,
            address token,
            uint256 amount,
            string memory memo,
        ) = abi.decode(_payload, (uint8, address, address, address, uint256, string, uint256));
        
        // Verify token is supported
        require(token == address(zToken) || token == address(nuToken), "Unsupported token");
        
        // Release tokens to recipient
        IERC20(token).safeTransfer(recipient, amount);
        
        emit BridgeCompleted(recipient, token, amount, _messageHash);
        emit TokensReleased(recipient, token, amount);
    }

    /**
     * @dev Process mining reward message
     */
    function _processMiningReward(bytes memory _payload) internal {
        (
            ,
            address miner,
            uint256 reward,
            uint256 blockHeight,
        ) = abi.decode(_payload, (uint8, address, uint256, uint256, uint256));
        
        // Emit event for mining reward notification
        // Additional logic can be added here for reward distribution
    }

    /**
     * @dev Process cross-chain transaction
     */
    function _processCrossChainTransaction(bytes memory _payload) internal {
        (
            ,
            address sender,
            address recipient,
            bytes memory data,
        ) = abi.decode(_payload, (uint8, address, address, bytes, uint256));
        
        // Execute cross-chain transaction
        // This is a simplified implementation
        if (recipient != address(0) && data.length > 0) {
            (bool success,) = recipient.call(data);
            require(success, "Cross-chain transaction failed");
        }
    }

    /**
     * @dev Set trusted remote address for a chain
     * @param _chainId Chain ID
     * @param _remoteAddress Remote contract address
     */
    function setTrustedRemote(uint16 _chainId, bytes calldata _remoteAddress) external onlyOwner {
        trustedRemoteLookup[_chainId] = _remoteAddress;
        supportedChains[_chainId] = true;
    }

    /**
     * @dev Get estimated fees for cross-chain message
     * @param _dstChainId Destination chain ID
     * @param _payload Message payload
     * @return nativeFee Native token fee
     * @return zroFee ZRO token fee
     */
    function estimateFees(
        uint16 _dstChainId,
        bytes calldata _payload
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        return lzEndpoint.estimateFees(
            _dstChainId,
            address(this),
            _payload,
            false,
            bytes("")
        );
    }

    /**
     * @dev Emergency withdrawal function
     * @param _token Token address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    /**
     * @dev Update supported chain status
     * @param _chainId Chain ID
     * @param _supported Whether chain is supported
     */
    function setSupportedChain(uint16 _chainId, bool _supported) external onlyOwner {
        supportedChains[_chainId] = _supported;
    }
    
    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}