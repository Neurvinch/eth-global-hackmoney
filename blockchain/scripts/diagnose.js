import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Address: ${deployer.address}`);

    // Get mined nonce (safe)
    const nonceMined = await hre.ethers.provider.getTransactionCount(deployer.address);
    console.log(`Nonce (Mined): ${nonceMined}`);

    // Get pending nonce (includes stuck txs)
    const noncePending = await hre.ethers.provider.getTransactionCount(deployer.address, "pending");
    console.log(`Nonce (Pending): ${noncePending}`);

    if (noncePending > nonceMined) {
        console.log(`WARNING: You have ${noncePending - nonceMined} pending transactions stuck in the mempool!`);
        console.log(`These must be cleared before new deployments can proceed effectively.`);
    } else {
        console.log("No stuck transactions detected.");
    }

    const feeData = await hre.ethers.provider.getFeeData();
    console.log("Current Fee Data:", {
        gasPrice: feeData.gasPrice ? hre.ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei" : "null",
        maxFeePerGas: feeData.maxFeePerGas ? hre.ethers.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei" : "null",
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? hre.ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " gwei" : "null",
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
