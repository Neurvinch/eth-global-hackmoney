const { ethers } = require('ethers');
require('dotenv').config();

/**
 * @title Bol-DeFi ENS Service
 * @dev Handles identity resolution and decentralized configuration storage.
 * We use ENS Text Records to store metadata like "groupRules", "description", etc.
 */
class ENSService {
    constructor() {
        // Connect to Mainnet for ENS resolution (ENS is primarily on Mainnet)
        // In local development, you might use a mock or a specific testnet ENS.
        const rpcUrl = process.env.MAINNET_RPC_URL || "https://rpc.ankr.com/eth";
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * Resolves an ENS name to an Ethereum address.
     * @param {string} name - e.g., "bol-defi.eth"
     */
    async resolveName(name) {
        try {
            const address = await this.provider.resolveName(name);
            return address;
        } catch (error) {
            console.error(`ENS Resolve Error for ${name}:`, error);
            return null;
        }
    }

    /**
     * Retrieves a text record from an ENS name.
     * We use this to fetch group parameters stored on-chain.
     * @param {string} name - ENS Name
     * @param {string} key - The text record key (e.g., "description", "rules")
     */
    async getText(name, key) {
        try {
            const resolver = await this.provider.getResolver(name);
            if (!resolver) return null;

            const value = await resolver.getText(key);
            return value;
        } catch (error) {
            console.error(`ENS GetText Error for ${name} [${key}]:`, error);
            return null;
        }
    }

    /**
     * Sets a text record on an ENS name.
     * NOTE: This requires a signer (wallet) and costs gas.
     * @param {string} name - ENS Name
     * @param {string} key - The text record key
     * @param {string} value - The text to store
     * @param {ethers.Signer} signer - The authorized wallet for the ENS name
     */
    async setText(name, key, value, signer) {
        try {
            const resolverAddress = await this.provider.getResolver(name);
            if (!resolverAddress) throw new Error("No resolver found");

            const resolverContract = new ethers.Contract(
                resolverAddress.address,
                ["function setText(bytes32 node, string key, string value) external"],
                signer
            );

            const node = ethers.namehash(name);
            const tx = await resolverContract.setText(node, key, value);
            await tx.wait();

            return tx.hash;
        } catch (error) {
            console.error(`ENS SetText Error:`, error);
            throw error;
        }
    }
}

module.exports = new ENSService();
