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
  
  if (network.chainId === 2330) {
    // Altcoinchain addresses
    WATT_TOKEN_ADDRESS = "0x..."; // Replace with actual WATT token address on Altcoinchain
    GENESIS_BADGE_ADDRESS = "0x..."; // Replace with actual Genesis Badge address
  } else if (network.chainId === 137) {
    // Polygon addresses
    WATT_TOKEN_ADDRESS = "0x..."; // Replace with actual WATT token address on Polygon
    GENESIS_BADGE_ADDRESS = "0x..."; // Replace with actual Genesis Badge address
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
    "0x1111111111111111111111111111111111111111", // GPU contract
    "0x2222222222222222222222222222222222222222", // CPU contract
    "0x3333333333333333333333333333333333333333", // Memory contract
    "0x4444444444444444444444444444444444444444", // Storage contract
  ];
  
  for (const contractAddr of mockComponentContracts) {
    await nftMiningRig.addApprovedComponentContract(contractAddr);
    console.log("Added approved component contract:", contractAddr);
  }
  
  // Set component values for testing
  await nftMiningRig.setComponentValues(1, "RTX 4090", 2000000, 450); // GPU
  await nftMiningRig.setComponentValues(0, "Intel i9-13900K", 500000, 125); // CPU
  await nftMiningRig.setComponentValues(2, "DDR5-6000 32GB", 50000, 20); // Memory
  console.log("Set initial component values");
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name, "(Chain ID:", network.chainId + ")");
  console.log("WATT Token:", WATT_TOKEN_ADDRESS);
  console.log("Genesis Badge:", GENESIS_BADGE_ADDRESS);
  console.log("NFT Mining Rig:", nftMiningRig.address);
  console.log("Mining Pool Operator:", miningPoolOperator.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
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