const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mock USDC address for Sepolia (replace with actual or mock)
    const mockUsdcAddress = "0x94a10348618eb3a182f7e7658b4221798365d96a"; // Example Sepolia USDC

    const ROSCA = await hre.ethers.getContractFactory("ROSCA");
    const rosca = await ROSCA.deploy(mockUsdcAddress);

    await rosca.waitForDeployment();

    console.log(`ROSCA deployed to: ${await rosca.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
