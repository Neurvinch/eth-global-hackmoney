import hre from "hardhat";

async function main() {
    console.log("Checking connection...");
    try {
        const [deployer] = await hre.ethers.getSigners();
        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log(`Connected to network: ${hre.network.name}`);
        console.log(`Deployer address: ${deployer.address}`);
        console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

        const blockNumber = await hre.ethers.provider.getBlockNumber();
        console.log(`Current block number: ${blockNumber}`);
    } catch (error) {
        console.error("Connection failed:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
