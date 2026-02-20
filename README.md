# TokenImmo — Real-World Asset (RWA) Tokenization Platform

![TokenImmo Banner](https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=400&fit=crop)

**TokenImmo** is a full-stack, decentralized Real-World Asset (RWA) management platform built on the **Ethereum Sepolia (EVM)** blockchain. It allows users to invest in fractional real estate via ERC-20 tokens, securely hold unique property titles via ERC-721 NFTs, and trade these assets on compliant, on-chain marketplaces and Automated Market Makers (DEX) like Uniswap V2.

This project was developed as a Final Project to demonstrate advanced blockchain concepts including tokenization, on-chain compliance (KYC), decentralized trading, indexing, and oracles.

---

## 📑 Table of Contents
1. [Project Objectives & Requirements Checklist](#-project-objectives--requirements-checklist)
2. [Technical Choices & Justifications](#-technical-choices--justifications)
3. [System Architecture](#-system-architecture)
4. [Smart Contracts Deep Dive](#-smart-contracts-deep-dive)
5. [Backend: Indexer & Oracle Services](#-backend-indexer--oracle-services)
6. [Frontend Application](#-frontend-application)
7. [Installation & Setup Guide](#-installation--setup-guide)
8. [Deployment to Sepolia Testnet](#-deployment-to-sepolia-testnet)
9. [Demo Workflow (For Grading)](#-demo-workflow-for-grading)

---

## 📌 Project Objectives & Requirements Checklist

This project strictly adheres to the final assignment guidelines:

### 1. Tokenization of Real-World Assets (RWAs) ✅
**Target Asset:** Real Estate Properties.
The platform supports **both** required types of tokenization in parallel:
- **Fungible Tokens (ERC-20):** `PropertyToken.sol` represents fractional shares of a property. It allows liquid, low-barrier investments (e.g., buying 10 tokens out of 1,000 for a Parisian apartment).
- **Non-Fungible Tokens (ERC-721):** `PropertyNFT.sol` represents the unique, underlying legal ownership title (the "Deed") for a specific property. Each NFT is unique and points to IPFS metadata.

### 2. Compliance: On-Chain KYC & Whitelist/Blacklist ✅
**Implementation:** `ComplianceRegistry.sol`
- **On-Chain Enforcement:** The KYC system is strictly enforced at the smart contract level. We override the `_update()` function in both our ERC-20 and ERC-721 contracts to verify compliance on *every single transfer*.
- **Whitelist/Blacklist:** Users must be explicitly whitelisted by a protocol admin to hold, buy, or trade tokens. If a user acts maliciously, an admin can add them to the blacklist, which instantly revokes their ability to transfer assets, overriding their whitelisted status.
- **Frontend Admin Panel:** An admin dashboard (`/admin`) allows protocol administrators to manage the KYC statuses directly via the UI.

### 3. Token Trading (On-Chain) & DEX Liquidity ✅
**Implementation:** `TokenSwapPool.sol` & Uniswap V2 Integration
Tokens are fully tradable on-chain via multiple mechanisms:
- **Internal AMM Pool:** A custom-built constant product (x*y=k) liquidity pool allowing direct ETH ↔ Token swaps.
- **DEX Integration (Uniswap V2 / Sushiswap V2):** We explicitly integrated the official Uniswap V2 Router on the Sepolia Testnet. 
  - We programmatically created the `WETH / PAR7E` trading pair.
  - The Uniswap Pair and Router contracts are explicitly **whitelisted** in the `ComplianceRegistry` to allow the DEX to route compliant tokens.
  - Initial liquidity was supplied using a dedicated backend setup script.
- **P2P Marketplaces:** Limit-order style trading is available via `PropertyMarketplace.sol` (ERC-20) and `NFTMarketplace.sol` (ERC-721).

### 4. Real-Time On-Chain Awareness (Indexer) ✅
**Implementation:** `backend/src/services/indexer.js`
- A background chron service polls the Sepolia blockchain every 60 seconds.
- It parses events across all 7 smart contracts (e.g., `TokensPurchased`, `SwapETHForToken`, `AddressWhitelisted`) as well as **external Uniswap V2 Pair events** (`Swap`).
- **Real-Time Sync:** If a user performs a token swap directly via the Uniswap UI or a block explorer, our Indexer detects the `Swap` event and syncs it into our local SQLite database. The frontend then automatically updates portfolio balances and the transaction history without requiring manual user input.

### 5. Oracles ✅
**Implementation:** `PriceOracle.sol` & `backend/src/services/oracle.js`
- An on-chain oracle stores the valuation of the tokenized assets along with a "confidence" metric.
- A Node.js background service acts as the data provider, simulating market price feeds and pushing batched updates to the Sepolia smart contract every 5 minutes.
- The `isPriceStale` function ensures that decentralized applications reading the oracle can verify the freshness of the data.

---

## ⚖️ Technical Choices & Justifications

**Blockchain:** Ethereum Sepolia (EVM).
**Why EVM over XRP Ledger (XRPL)?**
1. **DeFi Standard:** Ethereum and EVM-compatible chains remain the undisputed industry standard for Decentralized Finance (DeFi) and complex fractionalized RWA tokenization.
2. **Turing-Complete Programmability:** Implementing complex custom logic, such as overriding the `_update()` function for on-chain KYC compliance, is natively supported and highly expressive in Solidity.
3. **DEX Composability:** Choosing the EVM allowed us to demonstrate a deeper understanding of standard composable DeFi building blocks by directly integrating with the official **Uniswap V2 Router**, a core milestone of decentralized trading history.
4. **Tooling Maturity:** The EVM ecosystem offers a significantly more mature and accessible toolset for full-stack developers, including Hardhat, Ethers.js, Wagmi, and Viem, which allowed for rapid prototyping within the 5-week timeframe.

---

## 🏗 System Architecture

The project is divided into three main folders:

```text
blockchain_project/
├── blockchain/        # Solidity Smart Contracts, Hardhat config, deployment scripts
├── backend/           # Node.js/Express API, SQLite Database, Indexer & Oracle Cron Jobs
└── frontend/          # Next.js (React) UI, Tailwind CSS, Wagmi/RainbowKit Web3 integration
```

### Architectural Flow:
1. **Smart Contracts** act as the ultimate source of truth (State, Ownership, KYC).
2. The **Backend Indexer** listens to blockchain events and builds a fast, queryable relational database (SQLite).
3. The **Backend Oracle** pushes external real-world data (property prices) onto the blockchain.
4. The **Frontend** queries the Backend for fast initial loads (history, property catalogs) but interacts directly with the **Blockchain** via MetaMask (Wagmi/Viem) for all state-changing actions (Buying, Swapping, Listing).

---

## 📜 Smart Contracts Deep Dive

All contracts are written in Solidity `^0.8.24` and utilize OpenZeppelin libraries for security.

1. **`ComplianceRegistry.sol`**: The core KYC registry. Contains mappings for `_whitelisted` and `_blacklisted` addresses. Exposes `isCompliant(address)` which returns true only if an address is whitelisted and NOT blacklisted.
2. **`PropertyToken.sol`**: An ERC-20 token representing fractional shares. Overrides the `_update` hook to require `ComplianceRegistry.isCompliant()` for both the sender and receiver.
3. **`PropertyNFT.sol`**: An ERC-721 token representing the unique property deed. Also enforces compliance on transfer. Stores on-chain metadata (Asset Type, Location, Valuation).
4. **`PropertyMarketplace.sol`**: A peer-to-peer order book for ERC-20 tokens. Allows compliant users to list tokens for sale at a specific price and others to buy them.
5. **`NFTMarketplace.sol`**: A peer-to-peer order book for ERC-721 tokens.
6. **`TokenSwapPool.sol`**: A built-in Automated Market Maker (AMM) using the $x*y=k$ constant product formula to provide instant liquidity for ETH ↔ Token swaps.
7. **`PriceOracle.sol`**: Stores token prices updated by an authorized off-chain backend worker. Exposes `getPrice` and `isPriceStale`.

---

## ⚙️ Backend: Indexer & Oracle Services

The backend is a Node.js Express server backed by a SQLite database.

### The Indexer (`services/indexer.js`)
Runs a cron job every 60 seconds.
- Fetches logs using `eth_getLogs` in batches of 10 blocks (to respect free-tier RPC limits like Alchemy).
- Decodes events using Ethers.js interfaces.
- Updates SQLite tables (`users`, `transactions`, `properties`, `nfts`).
- **External DEX Tracking:** Explicitly monitors the Uniswap V2 Pair contract address for `Swap` events to ensure trades made outside the TokenImmo UI are reflected in the user's portfolio.

### The Oracle (`services/oracle.js`)
Runs a cron job every 5 minutes.
- Simulates fetching real-world pricing data for properties.
- Computes a new price (e.g., adding a slight random market fluctuation).
- Sends a transaction to `PriceOracle.sol` calling `updatePrice()`.

---

## 💻 Frontend Application

Built with **Next.js 16**, **React 19**, and styled with **Tailwind CSS**.

- **Web3 Integration:** Uses `Wagmi v2` and `Viem` for robust blockchain interactions, contract reads, and writes. `RainbowKit` is used for a polished wallet connection experience.
- **State Management:** Utilizes React Context (`PropertyContext`, `PortfolioContext`, `TransactionContext`) to globally manage indexed data fetched from the REST API, combined with real-time on-chain data fetched via Wagmi hooks.
- **Key Pages:**
  - `/properties`: Catalog of available real estate assets.
  - `/properties/[id]`: Detailed view of an asset, its financials, and the token purchasing interface.
  - `/swap`: The DEX interface. Allows users to trade on the internal AMM pool or route trades through the official **Uniswap V2** Sepolia contracts. Displays real-time Oracle prices.
  - `/portfolio`: Shows the user's holdings and calculated ROI based on the smart contracts.
  - `/admin`: Restricted panel to manage the KYC Whitelist/Blacklist.

---

## 🛠 Installation & Setup Guide

### Prerequisites
- Node.js >= 18
- MetaMask extension installed and configured for **Ethereum Sepolia**.
- An Alchemy account (for the RPC URL).

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd blockchain_project

# Install dependencies in all sub-projects
cd blockchain && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration
Create the necessary `.env` files based on the `.env.example` files provided.

**`blockchain/.env`**:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
DEPLOYER_PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
```

**`backend/.env`**:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
DEPLOYER_PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY

# Uniswap V2 Official Sepolia Addresses
UNISWAP_V2_ROUTER_ADDRESS=0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008
UNISWAP_V2_FACTORY_ADDRESS=0x7E0987E5b3a30e3f2828572Bb659A548460a3003
SUSHISWAP_V2_ROUTER_ADDRESS=0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008
SUSHISWAP_V2_FACTORY_ADDRESS=0x7E0987E5b3a30e3f2828572Bb659A548460a3003
WETH_ADDRESS=0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9
```

**`frontend/.env.local`**:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production-abc123
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo_project_id
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# These will be updated automatically by the sync script, but here is the template:
NEXT_PUBLIC_COMPLIANCE_REGISTRY=
NEXT_PUBLIC_PRICE_ORACLE=
NEXT_PUBLIC_PROPERTY_TOKEN=
NEXT_PUBLIC_PROPERTY_NFT=
NEXT_PUBLIC_PROPERTY_MARKETPLACE=
NEXT_PUBLIC_NFT_MARKETPLACE=
NEXT_PUBLIC_TOKEN_SWAP_POOL=

NEXT_PUBLIC_UNISWAP_V2_ROUTER=0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008
NEXT_PUBLIC_UNISWAP_V2_FACTORY=0x7E0987E5b3a30e3f2828572Bb659A548460a3003
NEXT_PUBLIC_SUSHISWAP_V2_ROUTER=0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008
NEXT_PUBLIC_SUSHISWAP_V2_FACTORY=0x7E0987E5b3a30e3f2828572Bb659A548460a3003
NEXT_PUBLIC_WETH_ADDRESS=0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9
```

---

## 🌍 Deployment to Sepolia Testnet

To save on Testnet ETH, we use a `lowcost` deployment script that adjusts the mock property prices.

```bash
# 1. Deploy contracts and mint initial assets
cd blockchain
npm run deploy:sepolia:lowcost

# 2. Sync deployed addresses to the frontend environment
node scripts/sync-addresses.js

# 3. Add liquidity to the AMM and Uniswap, and whitelist Uniswap pairs
cd ../backend
node add-liquidity-all.js

# 4. Seed the local SQLite database
npm run seed
```

---

## 🏃‍♂️ Running the Platform

You need to run both the Backend and Frontend concurrently.

**Terminal 1 (Backend: API, Indexer, Oracle):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend: Next.js UI):**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🎓 Demo Workflow (For Grading)

Follow these steps during your presentation to prove all requirements are met:

1. **Demonstrate Strict Compliance (The Reject):**
   - Connect a brand new MetaMask wallet (on Sepolia) that has *not* been whitelisted.
   - Attempt to buy a token on `/properties` or execute a swap on `/swap`.
   - Show the UI/Blockchain rejecting the transaction because the wallet is not KYC compliant.

2. **Demonstrate Admin Powers (The Whitelist):**
   - Switch to your Deployer wallet (Admin).
   - Navigate to `/admin`.
   - Add the new testing wallet address to the KYC Whitelist.

3. **Demonstrate Tokenization (The Purchase):**
   - Switch back to the newly whitelisted wallet.
   - Go to `/properties`, select a property (e.g., Paris 7e), and successfully purchase tokens (ERC-20).
   - Go to `/nfts` and show the unique ERC-721 Property Deeds.

4. **Demonstrate DEX Trading & Oracle (The Swap):**
   - Navigate to `/swap`.
   - Select **Uniswap V2**.
   - Swap some of your newly acquired `PAR7E` tokens back to `ETH`.
   - Point out the Oracle price feed widget updating in real-time on the right side of the screen.

5. **Demonstrate Real-Time Awareness (The Indexer):**
   - Navigate to `/transactions`.
   - Show that the purchase and the Uniswap swap are already listed in the database history, proving the background indexer successfully parsed the on-chain events and synced them to the backend.

---
*Developed for educational purposes as part of the Tokenized Asset Management Platform Final Project.*