const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Contract addresses (update these with actual addresses)
  let WATT_TOKEN_ADDRESS;
  let GENESIS_BADGE_ADDRESS;
  let MINING_GAME_BASE_CONTRACT;
  
  if (network.chainId === 2330) {
    // Altcoinchain addresses (from Mining Game)
    WATT_TOKEN_ADDRESS = "0x6645143e49B3a15d8F205658903a55E520444698"; // WATT token on Altcoinchain
    GENESIS_BADGE_ADDRESS = "0xf9670e5D46834561813CA79854B3d7147BBbFfb2"; // Mining Game NFTs contract
    MINING_GAME_BASE_CONTRACT = "0xf9670e5D46834561813CA79854B3d7147BBbFfb2"; // Mining Game NFT contract
    NFT_STAKING_CONTRACT = "0xe463045318393095F11ed39f1a98332aBCc1A7b1"; // NFT Staking contract
    NFT_STAKING_CONTRACT = "0xe463045318393095F11ed39f1a98332aBCc1A7b1"; // NFT Staking contract
  } else if (network.chainId === 137) {
    // Polygon addresses
    WATT_TOKEN_ADDRESS = "0x..."; // Update with actual WATT token address on Polygon
    GENESIS_BADGE_ADDRESS = "0x970a8b10147e3459d3cbf56329b76ac18d329728"; // Polygon contract
    MINING_GAME_BASE_CONTRACT = "0x970a8b10147e3459d3cbf56329b76ac18d329728"; // Polygon contract
    NFT_STAKING_CONTRACT = "0x..."; // Update with NFT Staking contract on Polygon
  } else {
    // Local/testnet - deploy mock tokens
    console.log("Deploying mock tokens for testing...");
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockWATT = await MockERC20.deploy("WATT Token", "WATT", ethers.utils.parseEther("1000000"));
    await mockWATT.deployed();
    WATT_TOKEN_ADDRESS = mockWATT.address;
    console.log("Mock WATT Token deployed to:", WATT_TOKEN_ADDRESS);
    
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const mockGenesisBadge = await MockERC721.deploy("Genesis Badge", "GENESIS");
    await mockGenesisBadge.deployed();
    GENESIS_BADGE_ADDRESS = mockGenesisBadge.address;
    console.log("Mock Genesis Badge deployed to:", GENESIS_BADGE_ADDRESS);
  }
  
  // Deploy NFTMiningRig contract
  console.log("\nDeploying NFTMiningRig contract...");
  const NFTMiningRig = await ethers.getContractFactory("NFTMiningRig");
  const nftMiningRig = await NFTMiningRig.deploy(
    WATT_TOKEN_ADDRESS,
    GENESIS_BADGE_ADDRESS,
    "Mining Rig NFT",
    "MINING_RIG"
  );
  await nftMiningRig.deployed();
  console.log("NFTMiningRig deployed to:", nftMiningRig.address);
  
  // Deploy MiningPoolOperator contract
  console.log("\nDeploying MiningPoolOperator contract...");
  const MiningPoolOperator = await ethers.getContractFactory("MiningPoolOperator");
  const miningPoolOperator = await MiningPoolOperator.deploy(
    WATT_TOKEN_ADDRESS,
    nftMiningRig.address
  );
  await miningPoolOperator.deployed();
  console.log("MiningPoolOperator deployed to:", miningPoolOperator.address);
  
  // Setup initial configuration
  console.log("\nSetting up initial configuration...");
  
  // Add some approved component contracts (mock addresses for testing)
  const mockComponentContracts = [
    MINING_GAME_BASE_CONTRACT, // Real Mining Game contract
    NFT_STAKING_CONTRACT, // NFT Staking contract
  ];
  
  for (const contractAddr of mockComponentContracts) {
    if (contractAddr) {
      await nftMiningRig.addApprovedComponentContract(contractAddr);
      console.log("Added approved component contract:", contractAddr);
    }
  }
  
  // Set component values based on real Mining Game NFTs
  await nftMiningRig.setComponentValues(1, "GP50 GPU", 2000000, 450); // Token ID 5 - Legendary GPU
  await nftMiningRig.setComponentValues(1, "TX120 GPU", 1500000, 320); // Token ID 4 - Epic GPU  
  await nftMiningRig.setComponentValues(0, "XL1 Processor", 500000, 125); // Token ID 3 - Rare CPU
  await nftMiningRig.setComponentValues(7, "Free Mint PC Case", 0, 0); // Token ID 1 - Common Case
  await nftMiningRig.setComponentValues(7, "Genesis Badge", 0, 0); // Token ID 2 - Mythic Boost
  console.log("Set initial component values");
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name, "(Chain ID:", network.chainId + ")");
  console.log("Mining Game NFTs:", MINING_GAME_BASE_CONTRACT);
  console.log("NFT Staking:", NFT_STAKING_CONTRACT);
  console.log("WATT Token:", WATT_TOKEN_ADDRESS);
  console.log("NFT Mining Rig:", nftMiningRig.address);
  console.log("Mining Pool Operator:", miningPoolOperator.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    miningGameContract: MINING_GAME_BASE_CONTRACT,
    contracts: {
      wattToken: WATT_TOKEN_ADDRESS,
      genesisBadge: GENESIS_BADGE_ADDRESS,
      nftMiningRig: nftMiningRig.address,
      miningPoolOperator: miningPoolOperator.address
    },
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  const deploymentPath = `./deployments/${network.name}-${network.chainId}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });