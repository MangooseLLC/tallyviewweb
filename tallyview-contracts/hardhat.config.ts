import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const raw = process.env.PRIVATE_KEY ?? "";
const PRIVATE_KEY = raw ? (raw.startsWith("0x") ? raw : `0x${raw}`) : "";
const TALLYVIEW_RPC_URL =
  process.env.TALLYVIEW_RPC_URL ||
  "https://api.avax-test.network/ext/bc/C/rpc";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    "tallyview-testnet": {
      url: TALLYVIEW_RPC_URL,
      chainId: 43113,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;
