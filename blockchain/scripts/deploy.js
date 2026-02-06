import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // USDC address (from env or fallback to Arc/Sepolia native)
    const usdcAddress = process.env.USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
    console.log("Using USDC at:", usdcAddress);

    const ROSCA = await hre.ethers.getContractFactory("ROSCA");

    const feeData = await hre.ethers.provider.getFeeData();
    const overrides = {
        maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * 300n / 100n : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas * 300n / 100n : undefined,
    };

    const rosca = await ROSCA.deploy(usdcAddress, overrides);

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
