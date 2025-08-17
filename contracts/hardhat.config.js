require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Altcoinchain configuration
    altcoinchain: {
      url: process.env.ALTCOINCHAIN_RPC || "https://rpc.altcoinchain.network",
      chainId: 2330,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
    },
    // Polygon configuration
    polygon: {
      url: process.env.POLYGON_RPC || "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 30000000000, // 30 gwei
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Testnets
    goerli: {
      url: process.env.GOERLI_RPC || "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
      chainId: 5,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};