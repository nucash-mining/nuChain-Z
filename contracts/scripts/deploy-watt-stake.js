const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying WATT Stake contract with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // WATT token addresses for each network
  let WATT_TOKEN_ADDRESS;
  
  if (network.chainId === 2330) {
    // Altcoinchain
    WATT_TOKEN_ADDRESS = "0x6645143e49B3a15d8F205658903a55E520444698";
  } else if (network.chainId === 137) {
    // Polygon
    WATT_TOKEN_ADDRESS = "0xE960d5076cd3169C343Ee287A2c3380A222e5839";
  } else {
    console.error("Unsupported network for WATT Stake deployment");
    console.log("This contract should only be deployed on Altcoinchain (2330) or Polygon (137)");
    process.exit(1);
  }
  
  console.log("Using WATT Token address:", WATT_TOKEN_ADDRESS);
  
  // Deploy WATT Stake contract
  console.log("\nDeploying WATT Stake contract...");
  const Stakes = await ethers.getContractFactory("Stakes");
  
  // Constructor parameters for WATT staking
  const stakingParams = {
    wattToken: WATT_TOKEN_ADDRESS,
    owner: deployer.address,
    interestRate: 10, // 10% annual interest
    maturity: 365 * 24 * 60 * 60, // 1 year in seconds
    penalization: 25, // 25% penalty for early withdrawal
    lowerAmount: ethers.utils.parseEther("100") // Minimum 100 WATT to stake
  };
  
  const wattStake = await Stakes.deploy(
    stakingParams.wattToken,
    stakingParams.owner,
    stakingParams.interestRate,
    stakingParams.maturity,
    stakingParams.penalization,
    stakingParams.lowerAmount
  );
  
  await wattStake.deployed();
  console.log("WATT Stake contract deployed to:", wattStake.address);
  
  // Verify deployment parameters
  console.log("\nVerifying deployment parameters...");
  console.log("Interest Rate:", await wattStake.interest_rate(), "%");
  console.log("Maturity Period:", await wattStake.maturity(), "seconds (1 year)");
  console.log("Early Withdrawal Penalty:", await wattStake.penalization(), "%");
  console.log("Minimum Stake Amount:", ethers.utils.formatEther(await wattStake.lower_amount()), "WATT");
  console.log("Asset Token:", await wattStake.asset());
  console.log("Contract Owner:", await wattStake.getOwner());
  
  console.log("\n=== WATT Stake Deployment Summary ===");
  console.log("Network:", network.name, "(Chain ID:", network.chainId + ")");
  console.log("WATT Token:", WATT_TOKEN_ADDRESS);
  console.log("WATT Stake Contract:", wattStake.address);
  console.log("Deployer:", deployer.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      wattToken: WATT_TOKEN_ADDRESS,
      wattStake: wattStake.address
    },
    parameters: stakingParams,
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  const deploymentPath = `./deployments/watt-stake-${network.name}-${network.chainId}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
  
  console.log("\n🎉 WATT Stake contract deployed successfully!");
  console.log("Users can now stake WATT tokens to earn annual interest!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });