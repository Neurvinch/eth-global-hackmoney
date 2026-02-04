import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
    const pendingNonce = await hre.ethers.provider.getTransactionCount(deployer.address, "pending");

    console.log(`Current mined nonce: ${nonce}`);
    console.log(`Pending nonce: ${pendingNonce}`);

    if (pendingNonce > nonce) {
        console.log(`Clearing stuck transaction at nonce ${nonce}...`);

        const feeData = await hre.ethers.provider.getFeeData();
        // Use a very high gas price to ensure it clears
        const gasPrice = (feeData.gasPrice * 5n) / 2n; // 2.5x current gas price

        const tx = await deployer.sendTransaction({
            to: deployer.address,
            value: 0,
            nonce: nonce,
            gasPrice: gasPrice,
        });

        console.log(`Clear transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("Stuck transaction cleared!");
    } else {
        console.log("No stuck transaction found to clear.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
