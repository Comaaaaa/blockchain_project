# TokenImmo — Tokenized Real Estate Platform

Plateforme de gestion d'actifs immobiliers tokenises sur la blockchain Ethereum (EVM).

## Architecture

```
blockchain_project/
├── blockchain/          # Smart contracts (Solidity + Hardhat)
│   ├── contracts/       # 6 contrats Solidity
│   ├── scripts/         # Script de deploiement
│   └── hardhat.config.js
├── backend/             # API REST + Indexer + Oracle (Express.js)
│   └── src/
│       ├── routes/      # Endpoints API
│       ├── services/    # Indexer, Oracle, Blockchain
│       └── db/          # SQLite database
├── frontend/            # Interface utilisateur (Next.js + Wagmi)
│   └── src/
│       ├── app/         # Pages (Next.js App Router)
│       ├── components/  # Composants React
│       ├── context/     # State management (React Context)
│       ├── hooks/       # Custom hooks
│       └── lib/         # API client, contract ABIs, utils
└── start-dev.sh         # Script de demarrage
```

## Choix de la blockchain : Ethereum (Sepolia)

- Ecosysteme mature avec outils de developpement (Hardhat, Wagmi, Viem)
- Smart contracts en Solidity (ERC-20, ERC-721)
- DEX integre (pool AMM type Uniswap)
- Grande communaute et documentation extensive
- Compatible avec les wallets standards (MetaMask, WalletConnect)

## Fonctionnalites implementees

### 1. Tokenisation d'actifs reels (immobilier)
- **ERC-20 (PropertyToken.sol)** : Tokens fongibles representant des parts de proprietes
- **ERC-721 (PropertyNFT.sol)** : NFTs representant des actifs uniques (titres de propriete)
- Chaque bien immobilier est tokenise avec un nombre defini de tokens

### 2. Conformite : KYC on-chain + Whitelist/Blacklist
- **ComplianceRegistry.sol** : Contrat de conformite deploye on-chain
- Seules les adresses whitelistees (KYC approuve) peuvent detenir et echanger des tokens
- Mecanisme de blacklist pour revoquer l'acces
- Logique appliquee on-chain dans les fonctions `_update()` des tokens (pas juste en frontend)
- Interface admin pour gerer les adresses (page `/admin`)

### 3. Trading on-chain
- **PropertyMarketplace.sol** : Marketplace on-chain pour echanger des tokens entre utilisateurs whitelistes
- **TokenSwapPool.sol** : Pool AMM (x*y=k) pour swapper PAR7E tokens contre ETH
- Liquidite initiale fournie au deploiement (200 tokens + 0.2 ETH)
- Fee de swap : 0.3%
- Interface de swap (page `/swap`)

### 4. Indexer temps reel
- Service backend qui poll les evenements blockchain **toutes les minutes**
- Synchronise : evenements compliance, achats de tokens, listings marketplace, swaps, prix oracle
- Si un utilisateur swap directement sur le DEX (hors UI), le changement apparait dans l'app
- Base de donnees SQLite pour cache local

### 5. Oracle de prix
- **PriceOracle.sol** : Contrat oracle deploye on-chain
- Service backend qui pousse des prix toutes les 5 minutes
- Historique de prix stocke en base
- Affichage en temps reel sur la page Swap

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5, Hardhat |
| Backend | Node.js, Express.js, ethers.js 6, better-sqlite3, node-cron |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Web3 | Wagmi 2, Viem 2, RainbowKit 2 |
| Testnet | Ethereum Sepolia (ou Hardhat local) |

## Demarrage rapide

### Prerequis
- Node.js >= 18
- npm

### Installation

```bash
# Cloner le repository
git clone <url> && cd blockchain_project

# Installer les dependances
cd blockchain && npm install
cd ../backend && npm install
cd ../frontend && npm install
cd ..
```

### Lancement (tout-en-un)

```bash
./start-dev.sh
```

Ce script :
1. Demarre un noeud Hardhat local
2. Deploie les 6 smart contracts
3. Met a jour les adresses dans le frontend
4. Seed la base de donnees
5. Demarre le backend (port 3001) avec indexer + oracle
6. Demarre le frontend (port 3000)

### Lancement manuel

```bash
# Terminal 1 : Hardhat node
cd blockchain && npx hardhat node

# Terminal 2 : Deploy contracts
cd blockchain && npx hardhat run scripts/deploy.js --network localhost

# Terminal 3 : Backend
cd backend && npm run seed && npm run dev

# Terminal 4 : Frontend
cd frontend && npm run dev
```

### Utilisation

1. Ouvrir http://localhost:3000
2. Connecter MetaMask au reseau Hardhat local (localhost:8545, chain ID 31337)
3. Importer un compte Hardhat dans MetaMask (cle privee du deployer)
4. Aller sur `/admin` pour whitelister votre adresse
5. Acheter des tokens sur la page d'un bien
6. Swapper des tokens sur `/swap`
7. Creer des offres sur `/marketplace`

## Smart Contracts deployes

| Contrat | Description |
|---------|-------------|
| ComplianceRegistry | KYC + Whitelist/Blacklist on-chain |
| PropertyToken (PAR7E) | ERC-20 pour parts d'appartement |
| PropertyNFT (TIMMO) | ERC-721 pour actifs uniques |
| PropertyMarketplace | Marketplace de trading on-chain |
| TokenSwapPool | Pool AMM (liquidite ETH/PAR7E) |
| PriceOracle | Oracle de prix on-chain |

## API Backend

| Endpoint | Description |
|----------|-------------|
| GET /api/properties | Liste des proprietes |
| GET /api/compliance/status/:addr | Statut KYC d'une adresse |
| POST /api/compliance/whitelist | Whitelister une adresse |
| POST /api/compliance/blacklist | Blacklister une adresse |
| GET /api/marketplace/listings | Listings actifs |
| GET /api/marketplace/pool | Info du pool AMM |
| GET /api/transactions | Historique des transactions |
| GET /api/oracle/prices | Prix oracle actuels |
| GET /api/contracts | Adresses des contrats deployes |
