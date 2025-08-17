// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC1155 is ERC1155, Ownable {
    constructor() ERC1155("https://api.mining.game/{id}.json") {
        // Mint some tokens for testing
        _mint(msg.sender, 1, 10, ""); // Free mint Gaming PC
        _mint(msg.sender, 2, 1, "");  // Genesis Badge
        _mint(msg.sender, 3, 5, "");  // XL1 Processor
        _mint(msg.sender, 4, 3, "");  // TX120 GPU
        _mint(msg.sender, 5, 2, "");  // GP50 GPU
    }
    
    function mint(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external onlyOwner {
        _mintBatch(to, ids, amounts, "");
    }
}