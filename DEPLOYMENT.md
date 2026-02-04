# Bol-DeFi Deployment Guide

Complete deployment instructions for the Bol-DeFi platform.

---

## Prerequisites

- [x] Node.js v18+ installed
- [x] Bun runtime installed
- [x] MetaMask or compatible wallet
- [x] Arc Testnet USDC (from [faucet](https://faucet.circle.com/))
- [x] Arc Testnet Chain ID: `5042002`
- [x] Arc Testnet RPC: `https://rpc.testnet.arc.network`
- [x] **Note**: No ETH/Matic/Native token is required for gas. USDC is used as the native gas token on Arc.
- [x] Groq API key ([get here](https://console.groq.com/))
- [x] Alchemy RPC endpoint (Optional for Mainnet/Sepolia)

---

## Step 1: Deploy Smart Contracts

### 1.1 Configure Hardhat

```bash
cd blockchain
npm install
```

Create `.env` file:
```env
ARC_RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=your_wallet_private_key_here
```

### 1.2 Deploy ROSCA Contract

```bash
npx hardhat run scripts/deploy.js --network arc_testnet
```

**Copy the deployed contract address!** You'll need it for the backend.

Example output:
```
ROSCA Contract deployed to: 0x1234...5678
```

---

## Step 2: Configure Backend

### 2.1 Install Dependencies

```bash
cd backend
bun install
```

### 2.2 Create `.env` File

```env
GROQ_API_KEY=gsk_your_groq_key_here
PORT=3001

# Blockchain
PRIVATE_KEY=your_wallet_private_key_here
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
MAINNET_RPC_URL=https://rpc.ankr.com/eth
ROSCA_CONTRACT_ADDRESS=0x_deployed_contract_from_step_1.2
TREASURY_VAULT_ADDRESS=your_wallet_address_or_multisig
```

### 2.3 Get Yellow Network Test Tokens

```bash
curl -XPOST https://clearnet-sandbox.yellow.com/faucet/requestTokens \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"YOUR_WALLET_ADDRESS"}'
```

### 2.4 Start Backend

```bash
bun run dev
```

Should see:
```
🚀 Bol-DeFi Server Orchestrator running on port 3001
```

---

## Step 3: Configure Frontend

### 3.1 Install Dependencies

```bash
cd frontend
bun install
```

### 3.2 Create `.env` File

```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_from_walletconnect
```

Get WalletConnect Project ID: https://cloud.walletconnect.com/

### 3.3 Start Frontend

```bash
bun run dev
```

Should see:
```
VITE ready in 500ms
Local: http://localhost:5173
```

---

## Step 4: Test the Full Flow

### 4.1 Basic Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "running",
  "service": "Bol-DeFi Backend",
  "timestamp": "2026-02-04T..."
}
```

### 4.2 Voice Test

1. Open http://localhost:5173
2. Connect your wallet (Sepolia network)
3. Select language (e.g., Hindi)
4. Click microphone button
5. Speak: **"मैं एक नया ग्रुप बनाना चाहता हूं"** (I want to create a new group)
6. Review AI-extracted intent
7. Confirm → Transaction executes!

### 4.3 Direct API Test

Test transcription:
```bash
# Record audio and save as test.webm
curl -X POST http://localhost:3001/api/process-voice \
  -F "audio=@test.webm" \
  -F "language=hi"
```

---

## Step 5: Production Deployment

### 5.1 Deploy Backend (Render)

1. Push code to GitHub
2. Create new Web Service on [Render](https://render.com)
3. Connect repository
4. **Build Command**: `cd backend && bun install`
5. **Start Command**: `cd backend && bun run start`
6. Add environment variables from Step 2.2
7. Deploy!

### 5.2 Deploy Frontend (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

Update `.env` with production backend URL:
```env
VITE_API_URL=https://your-backend.onrender.com
```

### 5.3 Production Contracts (Mainnet)

> [!CAUTION]
> Only deploy to mainnet after thorough testing!

Update `hardhat.config.js`:
```javascript
mainnet: {
  url: process.env.MAINNET_RPC_URL,
  accounts: [process.env.MAINNET_PRIVATE_KEY],
  chainId: 1
}
```

Deploy:
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

---

## Troubleshooting

### Backend won't start
- ✅ Check `.env` file exists in `backend/`
- ✅ Verify Groq API key is valid
- ✅ Ensure port 3001 is not in use

### Frontend can't connect
- ✅ Backend running on correct port
- ✅ CORS enabled in backend
- ✅ VITE_API_URL matches backend URL

### Transactions failing
- ✅ Wallet has Sepolia ETH
- ✅ USDC allowance approved
- ✅ ROSCA contract address correct
- ✅ Network is Sepolia (chainId: 11155111)

### Yellow Network errors
- ✅ Request test tokens from faucet
- ✅ Private key has correct format (0x...)
- ✅ WebSocket connection to sandbox

---

## Monitoring

### Check Treasury Balance

```javascript
const treasury = require('./services/treasuryService');
await treasury.initialize();
const balance = await treasury.getTreasuryBalance();
console.log(`Treasury: ${balance.formatted} USDC`);
```

### Check Active Auctions

View orchestrator state:
```javascript
const orchestrator = require('./services/orchestrator');
console.log(orchestrator.activeAuctions);
```

---

## Security Checklist

- [ ] Private keys stored in `.env` (never committed)
- [ ] `.env` added to `.gitignore`
- [ ] Multi-sig wallet for treasury (production)
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all user inputs
- [ ] HTTPS only in production
- [ ] Regular security audits
- [ ] Contract verified on Etherscan

---

## Support

- **Documentation**: See [walkthrough.md](file:///C:/Users/fazeh/.gemini/antigravity/brain/3730e787-f1b5-4f4d-9c7d-bf0563a9fb01/walkthrough.md)
- **Architecture**: See [yellow_rosca_integration.md](file:///C:/Users/fazeh/.gemini/antigravity/brain/3730e787-f1b5-4f4d-9c7d-bf0563a9fb01/yellow_rosca_integration.md)
- **Issues**: Check console logs in browser and terminal

---

**Status**: Ready for deployment! 🚀
