require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: false
    }
  },
  networks: {
   hardhat: {
      chainId: 1337 
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337  
    }
  }
};
