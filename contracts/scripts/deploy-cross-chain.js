const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying cross-chain mining contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Contract addresses based on network
  let WATT_TOKEN_ADDRESS;
  let MINING_GAME_NFTS_ADDRESS;
  let NUCHAIN_RELAYER_ADDRESS;
  
  if (network.chainId === 2330) {
    // Altcoinchain
    WATT_TOKEN_ADDRESS = "0x6645143e49B3a15d8F205658903a55E520444698";
    MINING_GAME_NFTS_ADDRESS = "0xf9670e5D46834561813CA79854B3d7147BBbFfb2";
    NUCHAIN_RELAYER_ADDRESS = "0x0000000000000000000000000000000000000001"; // Update with actual relayer
  } else if (network.chainId === 137) {
    // Polygon
    WATT_TOKEN_ADDRESS = "0xE960d5076cd3169C343Ee287A2c3380A222e5839";
    MINING_GAME_NFTS_ADDRESS = "0x970a8b10147e3459d3cbf56329b76ac18d329728";
    NUCHAIN_RELAYER_ADDRESS = "0x0000000000000000000000000000000000000002"; // Update with actual relayer
  } else {
    console.error("Unsupported network for cross-chain mining deployment");
    process.exit(1);
  }
  
  console.log("Using WATT Token address:", WATT_TOKEN_ADDRESS);
  console.log("Using Mining Game NFTs address:", MINING_GAME_NFTS_ADDRESS);
  
  // Deploy MiningRigConfiguration contract
  console.log("\nDeploying MiningRigConfiguration contract...");
  const MiningRigConfiguration = await ethers.getContractFactory("MiningRigConfiguration");
  const miningRigConfig = await MiningRigConfiguration.deploy(
    WATT_TOKEN_ADDRESS,
    MINING_GAME_NFTS_ADDRESS,
    "Mining Rig Configuration",
    "MINING_CONFIG"
  );
  await miningRigConfig.deployed();
  console.log("MiningRigConfiguration deployed to:", miningRigConfig.address);
  
  // Deploy CrossChainMiningRelay contract
  console.log("\nDeploying CrossChainMiningRelay contract...");
  const CrossChainMiningRelay = await ethers.getContractFactory("CrossChainMiningRelay");
  const crossChainRelay = await CrossChainMiningRelay.deploy(
    WATT_TOKEN_ADDRESS,
    NUCHAIN_RELAYER_ADDRESS
  );
  await crossChainRelay.deployed();
  console.log("CrossChainMiningRelay deployed to:", crossChainRelay.address);
  
  // Deploy MiningPoolDeployment contract (updated)
  console.log("\nDeploying MiningPoolDeployment contract...");
  const MiningPoolDeployment = await ethers.getContractFactory("MiningPoolDeployment");
  const miningPoolDeployment = await MiningPoolDeployment.deploy(WATT_TOKEN_ADDRESS);
  await miningPoolDeployment.deployed();
  console.log("MiningPoolDeployment deployed to:", miningPoolDeployment.address);
  
  console.log("\n=== Cross-Chain Mining Deployment Summary ===");
  console.log("Network:", network.name, "(Chain ID:", network.chainId + ")");
  console.log("WATT Token:", WATT_TOKEN_ADDRESS);
  console.log("Mining Game NFTs:", MINING_GAME_NFTS_ADDRESS);
  console.log("Mining Rig Configuration:", miningRigConfig.address);
  console.log("Cross-Chain Mining Relay:", crossChainRelay.address);
  console.log("Mining Pool Deployment:", miningPoolDeployment.address);
  console.log("nuChain Relayer:", NUCHAIN_RELAYER_ADDRESS);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      wattToken: WATT_TOKEN_ADDRESS,
      miningGameNFTs: MINING_GAME_NFTS_ADDRESS,
      miningRigConfiguration: miningRigConfig.address,
      crossChainMiningRelay: crossChainRelay.address,
      miningPoolDeployment: miningPoolDeployment.address,
      nuChainRelayer: NUCHAIN_RELAYER_ADDRESS
    },
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  const deploymentPath = `./deployments/cross-chain-mining-${network.name}-${network.chainId}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
  
  console.log("\n🎉 Cross-chain mining system deployed successfully!");
  console.log("Ready for nuChain L2 zk-Rollup and zChain UTXO sidechain integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });