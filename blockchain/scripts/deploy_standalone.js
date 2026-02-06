import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Deploying with wallet:", wallet.address);

    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ROSCA.sol/ROSCA.json', 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    const usdcAddress = process.env.USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

    console.log("Deploying ROSCA with USDC:", usdcAddress);

    const rosca = await factory.deploy(usdcAddress);
    console.log("Tx Hash:", rosca.deploymentTransaction().hash);

    await rosca.waitForDeployment();
    console.log("ROSCA deployed to:", await rosca.getAddress());
}

main().catch(console.error);
