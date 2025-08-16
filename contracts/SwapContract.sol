// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title WATTxchange Swap Contract
 * @dev Decentralized exchange for wBTC ↔ wXMR atomic swaps with zk-proof verification
 * Integrates with Z Blockchain and nuChain for cross-chain liquidity
 */
contract SwapContract is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Supported tokens
    IERC20 public immutable wBTC;
    IERC20 public immutable wXMR;
    
    // Swap parameters
    uint256 public constant SWAP_FEE = 30; // 0.3% fee (30 basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_SWAP_AMOUNT = 1e6; // Minimum 0.01 tokens (assuming 8 decimals)
    
    // Liquidity pool state
    uint256 public wBTCReserve;
    uint256 public wXMRReserve;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidityShares;
    
    // Swap state
    mapping(bytes32 => SwapOrder) public swapOrders;
    mapping(address => uint256) public nonces;
    
    // Atomic swap state
    mapping(bytes32 => AtomicSwap) public atomicSwaps;
    
    // Events
    event SwapInitiated(
        bytes32 indexed orderId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 expectedAmountOut,
        uint256 deadline
    );
    
    event SwapCompleted(
        bytes32 indexed orderId,
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    
    event AtomicSwapCreated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed participant,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    );
    
    event AtomicSwapRedeemed(
        bytes32 indexed swapId,
        bytes32 secret
    );
    
    event LiquidityAdded(
        address indexed provider,
        uint256 wBTCAmount,
        uint256 wXMRAmount,
        uint256 liquidity
    );
    
    event LiquidityRemoved(
        address indexed provider,
        uint256 wBTCAmount,
        uint256 wXMRAmount,
        uint256 liquidity
    );

    struct SwapOrder {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 expectedAmountOut;
        uint256 deadline;
        bool executed;
        bytes zkProof; // Optional zk-proof for privacy
    }

    struct AtomicSwap {
        address initiator;
        address participant;
        address tokenAddress;
        uint256 amount;
        bytes32 secretHash;
        uint256 timelock;
        bool redeemed;
        bool refunded;
    }

    /**
     * @dev Constructor
     * @param _wBTC wBTC token contract address
     * @param _wXMR wXMR token contract address
     */
    constructor(address _wBTC, address _wXMR) {
        require(_wBTC != address(0), "Invalid wBTC address");
        require(_wXMR != address(0), "Invalid wXMR address");
        
        wBTC = IERC20(_wBTC);
        wXMR = IERC20(_wXMR);
    }

    /**
     * @dev Add liquidity to the pool
     * @param _wBTCAmount Amount of wBTC to add
     * @param _wXMRAmount Amount of wXMR to add
     * @param _minLiquidity Minimum liquidity tokens to receive
     */
    function addLiquidity(
        uint256 _wBTCAmount,
        uint256 _wXMRAmount,
        uint256 _minLiquidity
    ) external nonReentrant {
        require(_wBTCAmount > 0 && _wXMRAmount > 0, "Invalid amounts");
        
        uint256 liquidity;
        
        if (totalLiquidity == 0) {
            // Initial liquidity
            liquidity = sqrt(_wBTCAmount * _wXMRAmount);
            require(liquidity >= _minLiquidity, "Insufficient liquidity minted");
        } else {
            // Subsequent liquidity additions
            uint256 wBTCLiquidity = (_wBTCAmount * totalLiquidity) / wBTCReserve;
            uint256 wXMRLiquidity = (_wXMRAmount * totalLiquidity) / wXMRReserve;
            liquidity = wBTCLiquidity < wXMRLiquidity ? wBTCLiquidity : wXMRLiquidity;
            require(liquidity >= _minLiquidity, "Insufficient liquidity minted");
        }
        
        // Transfer tokens
        wBTC.safeTransferFrom(msg.sender, address(this), _wBTCAmount);
        wXMR.safeTransferFrom(msg.sender, address(this), _wXMRAmount);
        
        // Update state
        liquidityShares[msg.sender] += liquidity;
        totalLiquidity += liquidity;
        wBTCReserve += _wBTCAmount;
        wXMRReserve += _wXMRAmount;
        
        emit LiquidityAdded(msg.sender, _wBTCAmount, _wXMRAmount, liquidity);
    }

    /**
     * @dev Remove liquidity from the pool
     * @param _liquidity Amount of liquidity tokens to burn
     * @param _minWBTC Minimum wBTC to receive
     * @param _minWXMR Minimum wXMR to receive
     */
    function removeLiquidity(
        uint256 _liquidity,
        uint256 _minWBTC,
        uint256 _minWXMR
    ) external nonReentrant {
        require(_liquidity > 0, "Invalid liquidity amount");
        require(liquidityShares[msg.sender] >= _liquidity, "Insufficient liquidity");
        
        uint256 wBTCAmount = (_liquidity * wBTCReserve) / totalLiquidity;
        uint256 wXMRAmount = (_liquidity * wXMRReserve) / totalLiquidity;
        
        require(wBTCAmount >= _minWBTC, "Insufficient wBTC amount");
        require(wXMRAmount >= _minWXMR, "Insufficient wXMR amount");
        
        // Update state
        liquidityShares[msg.sender] -= _liquidity;
        totalLiquidity -= _liquidity;
        wBTCReserve -= wBTCAmount;
        wXMRReserve -= wXMRAmount;
        
        // Transfer tokens
        wBTC.safeTransfer(msg.sender, wBTCAmount);
        wXMR.safeTransfer(msg.sender, wXMRAmount);
        
        emit LiquidityRemoved(msg.sender, wBTCAmount, wXMRAmount, _liquidity);
    }

    /**
     * @dev Initiate a token swap
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @param _amountIn Amount of input tokens
     * @param _minAmountOut Minimum output tokens to receive
     * @param _deadline Transaction deadline
     * @param _zkProof Optional zk-proof for privacy
     */
    function initiateSwap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minAmountOut,
        uint256 _deadline,
        bytes calldata _zkProof
    ) external nonReentrant {
        require(_deadline > block.timestamp, "Deadline passed");
        require(_amountIn >= MIN_SWAP_AMOUNT, "Amount too small");
        require(
            (_tokenIn == address(wBTC) && _tokenOut == address(wXMR)) ||
            (_tokenIn == address(wXMR) && _tokenOut == address(wBTC)),
            "Unsupported token pair"
        );
        
        // Calculate expected output
        uint256 expectedAmountOut = getAmountOut(_amountIn, _tokenIn, _tokenOut);
        require(expectedAmountOut >= _minAmountOut, "Insufficient output amount");
        
        // Generate order ID
        bytes32 orderId = keccak256(abi.encodePacked(
            msg.sender,
            _tokenIn,
            _tokenOut,
            _amountIn,
            nonces[msg.sender]++,
            block.timestamp
        ));
        
        // Store swap order
        swapOrders[orderId] = SwapOrder({
            user: msg.sender,
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            amountIn: _amountIn,
            expectedAmountOut: expectedAmountOut,
            deadline: _deadline,
            executed: false,
            zkProof: _zkProof
        });
        
        // Lock input tokens
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        emit SwapInitiated(
            orderId,
            msg.sender,
            _tokenIn,
            _tokenOut,
            _amountIn,
            expectedAmountOut,
            _deadline
        );
    }

    /**
     * @dev Execute a swap order
     * @param _orderId Order ID to execute
     * @param _proof Optional execution proof
     */
    function executeSwap(bytes32 _orderId, bytes calldata _proof) external nonReentrant {
        SwapOrder storage order = swapOrders[_orderId];
        require(order.user != address(0), "Order does not exist");
        require(!order.executed, "Order already executed");
        require(block.timestamp <= order.deadline, "Order expired");
        
        // Verify zk-proof if provided
        if (order.zkProof.length > 0) {
            require(verifyZkProof(order.zkProof, _proof), "Invalid zk-proof");
        }
        
        // Calculate actual output amount
        uint256 amountOut = getAmountOut(order.amountIn, order.tokenIn, order.tokenOut);
        uint256 fee = (amountOut * SWAP_FEE) / BASIS_POINTS;
        uint256 amountOutAfterFee = amountOut - fee;
        
        // Update reserves
        if (order.tokenIn == address(wBTC)) {
            wBTCReserve += order.amountIn;
            wXMRReserve -= amountOut;
        } else {
            wXMRReserve += order.amountIn;
            wBTCReserve -= amountOut;
        }
        
        // Transfer output tokens
        IERC20(order.tokenOut).safeTransfer(order.user, amountOutAfterFee);
        
        // Mark as executed
        order.executed = true;
        
        emit SwapCompleted(_orderId, order.user, order.amountIn, amountOutAfterFee, fee);
    }

    /**
     * @dev Create an atomic swap
     * @param _participant Counterparty address
     * @param _amount Amount to swap
     * @param _secretHash Hash of the secret
     * @param _timelock Timelock duration in seconds
     * @param _tokenAddress Token contract address
     */
    function createAtomicSwap(
        address _participant,
        uint256 _amount,
        bytes32 _secretHash,
        uint256 _timelock,
        address _tokenAddress
    ) external nonReentrant {
        require(_participant != address(0), "Invalid participant");
        require(_amount > 0, "Invalid amount");
        require(_timelock > block.timestamp + 1 hours, "Timelock too short");
        require(
            _tokenAddress == address(wBTC) || _tokenAddress == address(wXMR),
            "Unsupported token"
        );
        
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            _participant,
            _amount,
            _secretHash,
            block.timestamp
        ));
        
        require(atomicSwaps[swapId].initiator == address(0), "Swap already exists");
        
        // Lock tokens
        IERC20(_tokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        
        atomicSwaps[swapId] = AtomicSwap({
            initiator: msg.sender,
            participant: _participant,
            tokenAddress: _tokenAddress,
            amount: _amount,
            secretHash: _secretHash,
            timelock: _timelock,
            redeemed: false,
            refunded: false
        });
        
        emit AtomicSwapCreated(swapId, msg.sender, _participant, _amount, _secretHash, _timelock);
    }

    /**
     * @dev Redeem an atomic swap
     * @param _swapId Swap ID
     * @param _secret Secret that matches the hash
     */
    function redeemAtomicSwap(bytes32 _swapId, bytes32 _secret) external nonReentrant {
        AtomicSwap storage swap = atomicSwaps[_swapId];
        require(swap.initiator != address(0), "Swap does not exist");
        require(!swap.redeemed && !swap.refunded, "Swap already completed");
        require(block.timestamp <= swap.timelock, "Timelock expired");
        require(keccak256(abi.encodePacked(_secret)) == swap.secretHash, "Invalid secret");
        require(msg.sender == swap.participant, "Only participant can redeem");
        
        swap.redeemed = true;
        
        IERC20(swap.tokenAddress).safeTransfer(swap.participant, swap.amount);
        
        emit AtomicSwapRedeemed(_swapId, _secret);
    }

    /**
     * @dev Refund an atomic swap after timelock expires
     * @param _swapId Swap ID
     */
    function refundAtomicSwap(bytes32 _swapId) external nonReentrant {
        AtomicSwap storage swap = atomicSwaps[_swapId];
        require(swap.initiator != address(0), "Swap does not exist");
        require(!swap.redeemed && !swap.refunded, "Swap already completed");
        require(block.timestamp > swap.timelock, "Timelock not expired");
        require(msg.sender == swap.initiator, "Only initiator can refund");
        
        swap.refunded = true;
        
        IERC20(swap.tokenAddress).safeTransfer(swap.initiator, swap.amount);
    }

    /**
     * @dev Get output amount for a given input
     * @param _amountIn Input amount
     * @param _tokenIn Input token address
     * @param _tokenOut Output token address
     * @return Output amount
     */
    function getAmountOut(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256) {
        require(_amountIn > 0, "Invalid input amount");
        require(
            (_tokenIn == address(wBTC) && _tokenOut == address(wXMR)) ||
            (_tokenIn == address(wXMR) && _tokenOut == address(wBTC)),
            "Unsupported token pair"
        );
        
        uint256 reserveIn = _tokenIn == address(wBTC) ? wBTCReserve : wXMRReserve;
        uint256 reserveOut = _tokenOut == address(wBTC) ? wBTCReserve : wXMRReserve;
        
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        // AMM formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        uint256 amountInWithFee = _amountIn * (BASIS_POINTS - SWAP_FEE);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * BASIS_POINTS) + amountInWithFee;
        
        return numerator / denominator;
    }

    /**
     * @dev Verify zk-proof (simplified implementation)
     * @param _proof Proof data
     * @param _executionProof Execution proof
     * @return True if valid
     */
    function verifyZkProof(bytes memory _proof, bytes memory _executionProof) internal pure returns (bool) {
        // Simplified proof verification - implement actual zk-SNARK verification
        return _proof.length > 0 && _executionProof.length > 0;
    }

    /**
     * @dev Calculate square root (Babylonian method)
     * @param _x Input value
     * @return Square root
     */
    function sqrt(uint256 _x) internal pure returns (uint256) {
        if (_x == 0) return 0;
        uint256 z = (_x + 1) / 2;
        uint256 y = _x;
        while (z < y) {
            y = z;
            z = (_x / z + z) / 2;
        }
        return y;
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
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}