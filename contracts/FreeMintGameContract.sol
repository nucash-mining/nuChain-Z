// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FreeMintGameContract
 * @dev Handles free minting of Gaming PC Cases from Mining Game
 * Users can mint 1 free PC Case per account, additional mints available when staked
 */
contract FreeMintGameContract is ReentrancyGuard, Ownable {
    
    // Mining Game NFT contract
    IERC1155 public immutable miningGameNFTs;
    
    // PC Case token ID
    uint256 public constant PC_CASE_TOKEN_ID = 1;
    
    // Free mint tracking
    mapping(address => uint256) public freeMintCount;
    mapping(address => bool) public hasStakedPCCase;
    
    // Events
    event FreeMintUsed(
        address indexed user,
        uint256 tokenId,
        uint256 quantity,
        uint256 totalMinted
    );
    
    event StakingStatusUpdated(
        address indexed user,
        bool isStaked
    );

    constructor(address _miningGameNFTs) {
        require(_miningGameNFTs != address(0), "Invalid Mining Game NFTs address");
        miningGameNFTs = IERC1155(_miningGameNFTs);
    }

    /**
     * @dev Free mint Gaming PC Case (1 per account, additional when staked)
     */
    function freeMintPCCase() external nonReentrant {
        require(canFreeMint(msg.sender), "Free mint not available");
        
        // Mint PC Case from Mining Game contract
        // This would call the actual Mining Game contract mint function
        // For now, we track the mint and emit event
        
        freeMintCount[msg.sender]++;
        
        emit FreeMintUsed(
            msg.sender,
            PC_CASE_TOKEN_ID,
            1,
            freeMintCount[msg.sender]
        );
    }

    /**
     * @dev Check if user can free mint
     * @param _user User address
     * @return True if user can free mint
     */
    function canFreeMint(address _user) public view returns (bool) {
        // First free mint: always available
        if (freeMintCount[_user] == 0) {
            return true;
        }
        
        // Additional free mints: only if previous PC Case is staked
        return hasStakedPCCase[_user];
    }

    /**
     * @dev Update staking status when PC Case is staked/unstaked
     * @param _user User address
     * @param _isStaked Staking status
     */
    function updateStakingStatus(address _user, bool _isStaked) external onlyOwner {
        hasStakedPCCase[_user] = _isStaked;
        emit StakingStatusUpdated(_user, _isStaked);
    }

    /**
     * @dev Get user's free mint information
     * @param _user User address
     */
    function getUserMintInfo(address _user) external view returns (
        uint256 mintCount,
        bool canMint,
        bool isStaked
    ) {
        return (
            freeMintCount[_user],
            canFreeMint(_user),
            hasStakedPCCase[_user]
        );
    }

    /**
     * @dev Get total free mints used
     */
    function getTotalFreeMints() external view returns (uint256) {
        // This would aggregate all free mints across users
        // For now, return a placeholder
        return 0;
    }
}