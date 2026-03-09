import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24", // match your contracts' pragma
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    fuji: {
      url: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
      gasPrice: 25000000000, // 25 gwei — safe for Fuji
    },
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "your-snowtrace-api-key", // optional, for contract verification
    },
  },
};

export default config;