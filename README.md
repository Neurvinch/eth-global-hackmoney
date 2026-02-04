# 🎤 Bol-DeFi

**Voice-First Decentralized ROSCA Platform**

> Speak in your native language. Participate in transparent, blockchain-secured savings circles. Built with AI + DeFi.

---

## 🌟 What is Bol-DeFi?

Bol-DeFi enables users to create and join ROSCA (Rotating Savings and Credit Association) groups using **voice commands in their native language**. The platform combines:

- **AI**: Whisper for transcription + Llama-3 for intent extraction
- **DeFi**: Ethereum smart contracts for transparent settlement
- **Scaling**: Yellow Network for instant, zero-gas bidding
- **Stablecoins**: USDC for reliable value storage

---

## ✨ Key Features

### 🗣️ Voice-First UX
- Speak in Hindi, Tamil, Telugu, or English
- AI extracts structured intents from natural language
- User confirmation before blockchain execution

### ⚡ Instant Bidding
- Yellow Network state channels for real-time auctions
- Zero gas fees during bidding period
- Final settlement on-chain for transparency

### 💰 Auction-Based ROSCA
- Members bid with discounts to win the monthly pot
- Automatic dividend distribution to non-winners
- Platform fees configurable (default 1%)

### 🔒 Transparent & Fair
- All funds locked in audited smart contracts
- On-chain settlement ensures trustless execution
- Winner history prevents repeat participation

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Bun runtime
- Sepolia testnet ETH
- Groq API key

### 1. Clone & Install

```bash
git clone <repo-url>
cd eth-global-hackmoney

# Backend
cd backend && bun install

# Frontend
cd frontend && bun install
```

### 2. Configure Environment

**Backend `.env`**:
```env
GROQ_API_KEY=your_api_key
PRIVATE_KEY=your_wallet_private_key
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ROSCA_CONTRACT_ADDRESS=deployed_contract_address
```

**Frontend `.env`**:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Deploy Contract

```bash
cd blockchain
npm install
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Run the Stack

```bash
# Terminal 1: Backend
cd backend && bun run dev

# Terminal 2: Frontend
cd frontend && bun run dev
```

### 5. Test!

1. Open http://localhost:5173
2. Connect wallet (Sepolia)
3. Select language
4. Speak: "मैं एक नया ग्रुप बनाना चाहता हूं"
5. Confirm intent → Transaction executes! 🎉

---

## 📖 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment instructions
- **[Task List](C:/Users/fazeh/.gemini/antigravity/brain/3730e787-f1b5-4f4d-9c7d-bf0563a9fb01/task.md)** - Development progress
- See `brain/` folder for detailed walkthroughs and architecture docs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite, React, RainbowKit, Wagmi |
| **Backend** | Node.js, Express, Groq SDK |
| **AI** | Whisper-large-v3, Llama-3-70b |
| **Blockchain** | Solidity 0.8.20, Hardhat, OpenZeppelin |
| **Scaling** | Yellow Network Nitrolite SDK |
| **Treasury** | USDC, Ethers.js |
| **Identity** | ENS (Ethereum Name Service) |

---

## 🔐 Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control via Ownable pattern
- ✅ Input validation on all user inputs
- ✅ Private keys stored in environment variables
- ✅ Multi-sig recommended for production treasury

---

## 📜 License

MIT License

---

## 🙏 Acknowledgments

Built for **ETH Global HackMoney 2026**

Special thanks to:
- **Yellow Network** for off-chain scaling
- **Arc Protocol** for treasury infrastructure
- **Groq** for lightning-fast AI inference
- **ENS** for decentralized identity

---

**Made with ❤️ for financial inclusion**
