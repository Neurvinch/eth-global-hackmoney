import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mock USDC address for Sepolia (replace with actual or mock)
    const mockUsdcAddress = "0x94a10348618eb3a182f7e7658b4221798365d96a"; // Example Sepolia USDC

    const ROSCA = await hre.ethers.getContractFactory("ROSCA");

    // Create deployment transaction
    console.log("Sending deployment transaction...");

    const feeData = await hre.ethers.provider.getFeeData();
    const overrides = {
        maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * 300n / 100n : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * 300n / 100n : undefined,
    };
    console.log(`Using higher gas: maxFeePerGas=${overrides.maxFeePerGas}, maxPriorityFeePerGas=${overrides.maxPriorityFeePerGas}`);

    const rosca = await ROSCA.deploy(mockUsdcAddress, overrides);

    // In Ethers v6, deploymentTransaction() gives the tx response
    const deploymentTx = rosca.deploymentTransaction();
    if (deploymentTx) {
        console.log(`Transaction sent! Hash: ${deploymentTx.hash}`);
        console.log("Waiting for confirmations...");
    }

    await rosca.waitForDeployment();

    console.log(`ROSCA deployed to: ${await rosca.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
