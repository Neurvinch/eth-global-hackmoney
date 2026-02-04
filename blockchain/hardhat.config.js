import "@nomicfoundation/hardhat-toolbox";
// import dotenv from "dotenv";
// dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
    solidity: "0.8.20",
    /*
    networks: {
        hardhat: {},
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        arc_testnet: {
            url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
            chainId: 5042002
        },
    },
    */
};
arc_testnet: {
    url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
        accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
            chainId: 5042002
},
    },
};
