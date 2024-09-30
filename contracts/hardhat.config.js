require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: [ vars.get("SMART_CONTRACT_DEPLOYER") ],
    }
  }
};
