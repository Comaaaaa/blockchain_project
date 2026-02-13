# TokenImmo — Tokenized Real Estate Platform

Plateforme de gestion d'actifs immobiliers tokenises sur la blockchain Ethereum (EVM).

## Architecture

```
blockchain_project/
├── blockchain/          # Smart contracts (Solidity + Hardhat)
│   ├── contracts/       # 6 contrats Solidity
│   ├── scripts/         # Script de deploiement
│   ├── test/            # Tests unitaires (52 tests)
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
└── start-dev.sh         # Script de demarrage (mode local)
```

## Choix de la blockchain : Ethereum (Sepolia)

- Ecosysteme mature avec outils de developpement (Hardhat, Wagmi, Viem)
- Smart contracts en Solidity (ERC-20, ERC-721)
- DEX integre (pool AMM type Uniswap V2)
- Grande communaute et documentation extensive
- Compatible avec les wallets standards (MetaMask, WalletConnect)
- Testnet Sepolia gratuit et stable pour le deploiement

## Fonctionnalites implementees

### 1. Tokenisation d'actifs reels (immobilier)
- **ERC-20 (PropertyToken.sol)** : Tokens fongibles representant des parts de proprietes
- **ERC-721 (PropertyNFT.sol)** : NFTs representant des actifs uniques (titres de propriete, oeuvres d'art, collectibles)
- Chaque bien immobilier est tokenise avec un nombre defini de tokens

### 2. Conformite : KYC on-chain + Whitelist/Blacklist
- **ComplianceRegistry.sol** : Contrat de conformite deploye on-chain
- Seules les adresses whitelistees (KYC approuve) peuvent detenir et echanger des tokens
- Mecanisme de blacklist pour revoquer l'acces (override le whitelist)
- Logique appliquee **on-chain** dans les fonctions `_update()` des tokens (pas juste en frontend)
- Interface admin pour gerer les adresses (page `/admin`)

### 3. Trading on-chain
- **PropertyMarketplace.sol** : Marketplace on-chain pour echanger des tokens entre utilisateurs whitelistes
- **TokenSwapPool.sol** : Pool AMM (x*y=k) pour swapper PAR7E tokens contre ETH
- Liquidite initiale fournie au deploiement (200 tokens + 0.2 ETH)
- Fee de swap : 0.3%
- Interface de swap (page `/swap`)

### 4. Indexer temps reel

Voir la section detaillee ci-dessous.

### 5. Oracle de prix

Voir la section detaillee ci-dessous.

---

## Indexer — Real-Time On-Chain Awareness

### Objectif

L'indexer garantit que le frontend reflete **l'etat reel de la blockchain** en permanence. Meme si un utilisateur effectue un swap directement sur le DEX (par exemple via Etherscan ou un autre outil, sans passer par notre UI), le changement sera detecte et affiche dans l'application.

### Architecture

```
Blockchain (Sepolia)
    │
    │  Events emis par les smart contracts
    │  (AddressWhitelisted, TokensPurchased, SwapETHForToken, PriceUpdated, ...)
    │
    ▼
┌──────────────────────────────┐
│     INDEXER (backend)        │
│  services/indexer.js         │
│                              │
│  - Tourne toutes les 60s     │
│    (cron: "* * * * *")       │
│  - Scanne les nouveaux blocs │
│  - Parse les events des      │
│    6 smart contracts         │
│  - Sauvegarde en SQLite      │
│  - Gere les limites RPC      │
│    (batches de 10 blocs)     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     BASE DE DONNEES          │
│     SQLite (tokenimmo.db)    │
│                              │
│  Tables mises a jour :       │
│  - users (whitelist/blacklist│
│  - transactions (achats,     │
│    swaps, ventes)            │
│  - marketplace_listings      │
│  - oracle_prices             │
│  - indexer_state (dernier    │
│    bloc traite)              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     API REST (Express)       │
│  GET /api/transactions       │
│  GET /api/marketplace/...    │
│  GET /api/compliance/...     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     FRONTEND (Next.js)       │
│  TransactionContext.tsx       │
│  - Fetch toutes les 60s      │
│  - Affiche les transactions  │
│    indexees                   │
└──────────────────────────────┘
```

### Fonctionnement technique

**Fichier** : `backend/src/services/indexer.js`

1. **Recuperation du dernier bloc traite** : L'indexer stocke le numero du dernier bloc scanne dans la table `indexer_state`. Au prochain run, il reprend au bloc suivant.

2. **Scan par batches** : Pour respecter les limites des providers RPC gratuits (ex: Alchemy free tier = 10 blocs max par requete `eth_getLogs`), l'indexer decoupe les plages de blocs en batches de 10.

3. **Parsing des events** : Pour chaque batch, l'indexer interroge les 6 contrats pour recuperer leurs events :

| Contrat | Events indexes |
|---------|---------------|
| ComplianceRegistry | `AddressWhitelisted`, `AddressBlacklisted`, `AddressRemovedFromWhitelist`, `AddressRemovedFromBlacklist` |
| PropertyToken | `TokensPurchased` |
| PropertyMarketplace | `ListingCreated`, `ListingSold`, `ListingCancelled` |
| TokenSwapPool | `SwapETHForToken`, `SwapTokenForETH` |
| PriceOracle | `PriceUpdated` |

4. **Persistance** : Chaque event est converti en enregistrement SQL et insere dans la table appropriee. Les doublons sont ignores (`INSERT OR IGNORE`).

5. **Progression sauvegardee** : Apres chaque batch, le dernier bloc est sauvegarde. En cas de crash, l'indexer reprend exactement ou il s'est arrete.

### Scenario : swap hors UI

```
1. Un utilisateur appelle swapETHForToken() directement sur Etherscan
2. Le contrat TokenSwapPool emet l'event SwapETHForToken(user, ethIn, tokenOut)
3. L'indexer detecte cet event au prochain scan (~60s max)
4. Il insere une transaction de type "swap" dans la DB
5. Le frontend fetch GET /api/transactions et affiche le swap
```

### Lancement

L'indexer demarre automatiquement avec le backend :

```javascript
// backend/src/index.js
cron.schedule("* * * * *", async () => {
  await runIndexer();  // Toutes les minutes
});
```

### Diagnostic

```bash
cd backend && node diagnose.js
```

Cette commande affiche l'etat de l'indexer, le dernier bloc scanne, et le nombre de transactions indexees.

---

## Oracle — On-Chain Price Feed

### Objectif

L'oracle fournit des **donnees de prix on-chain** pour les actifs tokenises. Il permet aux utilisateurs et aux smart contracts d'acceder a une reference de prix fiable, avec un indicateur de confiance et une detection de donnees obsoletes (staleness).

### Architecture

```
┌──────────────────────────────┐
│   SOURCE DE PRIX             │
│   (simulation de marche)     │
│                              │
│   En production, ce serait : │
│   - CoinGecko API            │
│   - Chainlink Price Feed     │
│   - API immobiliere          │
│                              │
│   Ici : random walk ±5%      │
│   autour du prix de base     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   ORACLE SERVICE (backend)   │
│   services/oracle.js         │
│                              │
│   - Tourne toutes les 5 min  │
│     (cron: "*/5 * * * *")    │
│   - Calcule un nouveau prix  │
│   - Envoie une transaction   │
│     on-chain :               │
│     oracle.updatePrice(       │
│       tokenAddress,           │
│       priceWei,               │
│       confidence              │
│     )                        │
│   - Stocke aussi en SQLite   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   SMART CONTRACT             │
│   PriceOracle.sol            │
│                              │
│   Stockage on-chain :        │
│   mapping(address => {       │
│     price: uint256,     (wei)│
│     updatedAt: uint256,      │
│     confidence: uint256 (bps)│
│   })                         │
│                              │
│   Fonctions :                │
│   - updatePrice()            │
│   - batchUpdatePrices()      │
│   - getPrice() → (p, t, c)  │
│   - isPriceStale(token, age) │
│   - getAllRegisteredTokens() │
│                              │
│   Events :                   │
│   - PriceUpdated(token,      │
│     price, confidence, time) │
│   - TokenRegistered(token)   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   FRONTEND (page /swap)      │
│                              │
│   Affiche :                  │
│   - Prix actuel PAR7E en ETH │
│   - Niveau de confiance (%)  │
│   - Date de derniere MAJ     │
│   - Historique des prix      │
└──────────────────────────────┘
```

### Fonctionnement technique

**Contrat** : `blockchain/contracts/PriceOracle.sol`
**Service** : `backend/src/services/oracle.js`

#### 1. Mise a jour des prix (backend → blockchain)

Toutes les 5 minutes, le service oracle :

```javascript
// Simule une variation de marche (±5%)
const newPrice = basePrice * (1 + randomVariation);
const priceWei = ethers.parseEther(newPrice.toFixed(18));
const confidence = 9000 + Math.floor(Math.random() * 1000); // 90-100%

// Envoie la transaction on-chain
await oracle.updatePrice(tokenAddress, priceWei, confidence);
```

- **Prix** : Stocke en wei (18 decimales) pour la precision
- **Confiance** : En basis points (10000 = 100%). Indique la fiabilite de la source
- **Timestamp** : Automatiquement enregistre par le contrat (`block.timestamp`)

#### 2. Lecture des prix (blockchain → frontend)

N'importe qui peut lire le prix on-chain :

```solidity
function getPrice(address token) external view returns (
    uint256 price,      // Prix en wei
    uint256 updatedAt,  // Timestamp de la derniere MAJ
    uint256 confidence  // 0-10000 (basis points)
)
```

#### 3. Detection de prix obsoletes (staleness)

```solidity
function isPriceStale(address token, uint256 maxAge) external view returns (bool)
```

Si le prix n'a pas ete mis a jour depuis `maxAge` secondes, la fonction retourne `true`. Cela permet aux smart contracts ou au frontend de savoir si le prix est encore fiable.

#### 4. Batch updates

Pour mettre a jour plusieurs tokens en une seule transaction :

```solidity
function batchUpdatePrices(
    address[] calldata tokens,
    uint256[] calldata prices,
    uint256[] calldata confidences
) external onlyOwner
```

#### 5. Securite

- Seul le **owner** (le deployer/operateur oracle) peut mettre a jour les prix
- Le contrat rejette les prix a 0 et les adresses invalides
- La confiance est plafonnee a 10000 (100%)

### API Backend

| Endpoint | Description |
|----------|-------------|
| `GET /api/oracle/price/:tokenAddress` | Prix actuel on-chain (lu directement depuis le contrat) |
| `GET /api/oracle/prices` | Tous les prix enregistres |
| `GET /api/oracle/history/:tokenAddress?limit=50` | Historique des prix (depuis SQLite) |

### Exemple de reponse

```json
GET /api/oracle/price/0x8DbfB2D4EAc1F18C6eA05cB838C0b6113A2f6D38

{
  "price": "1045000000000000",
  "priceETH": "0.001045",
  "updatedAt": 1739451900,
  "confidence": 9638
}
```

### Lancement

L'oracle demarre automatiquement avec le backend :

```javascript
// backend/src/index.js
cron.schedule("*/5 * * * *", async () => {
  await updateOraclePrices();  // Toutes les 5 minutes
});
```

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5, Hardhat |
| Backend | Node.js, Express.js, ethers.js 6, better-sqlite3, node-cron |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Web3 | Wagmi 2, Viem 2, RainbowKit 2 |
| Testnet | Ethereum Sepolia |

## Demarrage rapide

### Prerequis
- Node.js >= 18
- npm
- MetaMask (configure sur Sepolia)

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

### Deploiement sur Sepolia

```bash
# 1. Configurer les cles dans blockchain/.env
#    SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/VOTRE_CLE
#    DEPLOYER_PRIVATE_KEY=VOTRE_CLE_PRIVEE

# 2. Deployer les 6 contrats
cd blockchain && npx hardhat run scripts/deploy.js --network sepolia

# 3. Lancer le backend (indexer + oracle demarrent automatiquement)
cd ../backend && npm run seed && npm run dev

# 4. Lancer le frontend
cd ../frontend && npm run dev
```

### Lancement local (Hardhat)

```bash
./start-dev.sh
```

### Utilisation

1. Ouvrir http://localhost:3000
2. Connecter MetaMask au reseau Sepolia (chainId 11155111)
3. Aller sur `/admin` pour whitelister votre adresse
4. Acheter des tokens sur la page d'un bien
5. Swapper des tokens sur `/swap` (prix oracle affiche en temps reel)
6. Creer des offres sur `/marketplace`
7. Verifier que les transactions apparaissent meme apres un refresh

### Diagnostic

```bash
cd backend && node diagnose.js
```

Verifie : connexion RPC, wallet, contrats on-chain, config frontend, etat de la DB et de l'indexer.

## Smart Contracts deployes (Sepolia)

| Contrat | Adresse | Description |
|---------|---------|-------------|
| ComplianceRegistry | `0xb18e1E3d...` | KYC + Whitelist/Blacklist on-chain |
| PropertyToken (PAR7E) | `0x8DbfB2D4...` | ERC-20 pour parts d'appartement |
| PropertyNFT (TIMMO) | `0x8E7cdACe...` | ERC-721 pour actifs uniques |
| PropertyMarketplace | `0x4Ffdc072...` | Marketplace de trading on-chain |
| TokenSwapPool | `0x083DAc70...` | Pool AMM (liquidite ETH/PAR7E) |
| PriceOracle | `0x3bB2d55A...` | Oracle de prix on-chain |

## Tests

```bash
cd blockchain && npx hardhat test
```

52 tests couvrant toutes les specifications :
- Tokenisation (ERC-20 + ERC-721)
- Compliance on-chain (whitelist/blacklist enforcement)
- Trading (marketplace + AMM pool)
- Oracle (prix, confiance, staleness)
- Integration (cross-contract compliance)

## API Backend

| Endpoint | Description |
|----------|-------------|
| `GET /api/properties` | Liste des proprietes |
| `GET /api/compliance/status/:addr` | Statut KYC d'une adresse |
| `POST /api/compliance/whitelist` | Whitelister une adresse |
| `POST /api/compliance/blacklist` | Blacklister une adresse |
| `GET /api/marketplace/listings` | Listings actifs |
| `GET /api/marketplace/pool` | Info du pool AMM |
| `GET /api/transactions` | Historique des transactions |
| `POST /api/transactions` | Enregistrer une transaction |
| `GET /api/oracle/price/:addr` | Prix oracle on-chain |
| `GET /api/oracle/history/:addr` | Historique des prix |
| `GET /api/contracts` | Adresses des contrats deployes |
| `GET /api/health` | Etat du backend + block actuel |
