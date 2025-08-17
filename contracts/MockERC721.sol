// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}
    
    function mint(address to) external returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        return tokenId;
    }
}