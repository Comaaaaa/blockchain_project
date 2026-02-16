# TokenImmo — Plateforme de Tokenisation Immobiliere sur Blockchain

Plateforme full-stack de gestion d'actifs immobiliers tokenises sur la blockchain Ethereum (EVM). Les utilisateurs peuvent investir dans l'immobilier fractionne via des tokens ERC-20, echanger des NFTs representant des actifs uniques (ERC-721), et trader sur des marketplaces on-chain et des DEX externes (Uniswap/SushiSwap V2).

---

## Architecture du projet

```
blockchain_project/
├── blockchain/                # Smart contracts Solidity + Hardhat
│   ├── contracts/             # 7 contrats Solidity
│   │   ├── ComplianceRegistry.sol   # KYC : whitelist / blacklist on-chain
│   │   ├── PropertyToken.sol        # ERC-20 : parts fractionnees de proprietes
│   │   ├── PropertyNFT.sol          # ERC-721 : actifs immobiliers uniques
│   │   ├── PropertyMarketplace.sol  # Marketplace P2P pour tokens ERC-20
│   │   ├── NFTMarketplace.sol       # Marketplace P2P pour NFTs ERC-721
│   │   ├── TokenSwapPool.sol        # Pool AMM (x*y=k) ETH/Token
│   │   └── PriceOracle.sol          # Oracle de prix on-chain
│   ├── scripts/
│   │   ├── deploy.js                # Deploiement complet + demo data
│   │   ├── setup-uniswap-v2.js      # Creation pair + liquidite Uniswap V2
│   │   ├── add-liquidity-sepolia.js # Ajout liquidite post-deploy (rescue)
│   │   └── sync-addresses.js        # Sync adresses → frontend .env.local
│   ├── properties-config.js         # Configuration des 6 biens immobiliers
│   └── hardhat.config.js
├── backend/                   # API REST + Indexer + Oracle (Express.js)
│   └── src/
│       ├── index.js                 # Point d'entree, cron jobs, routes
│       ├── routes/
│       │   ├── properties.js        # CRUD proprietes + filtres
│       │   ├── compliance.js        # KYC whitelist/blacklist
│       │   ├── marketplace.js       # Listings, pool AMM, DEX quotes
│       │   ├── transactions.js      # Historique transactions
│       │   ├── oracle.js            # Prix oracle + historique
│       │   ├── nfts.js              # Gestion NFTs + mint
│       │   └── contracts.js         # Adresses + ABIs des contrats
│       ├── services/
│       │   ├── blockchain.js        # Provider, signer, instances contrats
│       │   ├── indexer.js           # Sync events on-chain → SQLite
│       │   └── oracle.js            # Mise a jour periodique des prix
│       └── db/
│           ├── database.js          # Schema SQLite + migrations
│           └── seed.js              # Seed initial des proprietes
├── frontend/                  # Interface utilisateur (Next.js + Wagmi)
│   └── src/
│       ├── app/                     # Pages (Next.js App Router)
│       │   ├── (auth)/              # Authentification (signin, signup)
│       │   └── (main)/              # Pages principales
│       │       ├── page.tsx              # Accueil
│       │       ├── properties/           # Catalogue + detail + creation
│       │       ├── marketplace/          # Marche secondaire ERC-20
│       │       ├── nfts/                 # Galerie NFT + detail
│       │       ├── swap/                 # Swap tokens (pool + DEX)
│       │       ├── portfolio/            # Portefeuille utilisateur
│       │       ├── transactions/         # Historique transactions
│       │       └── admin/                # Gestion KYC + mint NFT
│       ├── components/              # Composants React reutilisables
│       │   ├── auth/                # SignInForm, SignUpForm
│       │   ├── layout/              # Header, Footer, PageContainer
│       │   ├── property/            # PropertyCard, PropertyGrid, Filters, TokenPurchaseForm
│       │   ├── marketplace/         # ListingCard, ListingGrid, CreateListingModal
│       │   ├── nft/                 # NFTCard, NFTGrid, NFTListModal, NFTBuyButton
│       │   ├── portfolio/           # PortfolioSummary, HoldingCard, HoldingsList
│       │   ├── transaction/         # TransactionTable
│       │   └── ui/                  # Button, Card, Input, Select, Modal, Badge, Tabs, Pagination, ProgressBar
│       ├── context/                 # State management (React Context)
│       │   ├── PropertyContext.tsx   # Proprietes + filtres + pagination
│       │   ├── PortfolioContext.tsx  # Holdings + statistiques
│       │   ├── TransactionContext.tsx# Transactions blockchain
│       │   └── MarketplaceContext.tsx# Listings marketplace
│       ├── hooks/                   # Custom hooks
│       │   ├── useETHPrice.ts       # Prix ETH/EUR (CoinGecko + cache)
│       │   ├── useProperties.ts     # Acces proprietes + filtres
│       │   ├── usePortfolio.ts      # Acces portefeuille
│       │   ├── usePropertyFilters.ts# Setters filtres granulaires
│       │   └── useTokenPurchase.ts  # Hook d'achat tokens
│       ├── lib/                     # Utilitaires
│       │   ├── api.ts               # Client API REST
│       │   ├── auth.ts              # Configuration NextAuth
│       │   ├── blockchain.ts        # Wrappers lecture blockchain
│       │   ├── contracts.ts         # ABIs + adresses contrats
│       │   ├── utils.ts             # Formatage (EUR, ETH, dates)
│       │   └── validators.ts        # Schemas Zod (formulaires)
│       ├── config/wagmi.ts          # Configuration Wagmi + RainbowKit
│       ├── providers/Providers.tsx   # Arbre de providers
│       ├── types/index.ts           # Types TypeScript
│       └── data/                    # Donnees statiques de fallback
├── start-dev.sh               # Demarrage complet mode local
└── README.md
```

---

## Choix de la blockchain : Ethereum (Sepolia)

- Ecosysteme mature avec outils de developpement (Hardhat, Wagmi, Viem)
- Smart contracts en Solidity (ERC-20, ERC-721)
- DEX integre (pool AMM interne + integration explicite Uniswap/Sushiswap V2)
- Grande communaute et documentation extensive
- Compatible avec les wallets standards (MetaMask, WalletConnect)
- Testnet Sepolia gratuit et stable pour le deploiement

---

## Design Choices

Cette section explique les decisions techniques principales du projet et leur lien direct avec le sujet du rendu final.

### 1) Choix de la chaine (EVM / Ethereum Sepolia)

**Decision**: utiliser un environnement EVM (Ethereum Sepolia).

**Justification**:
- Ecosysteme mature pour Solidity (Hardhat, ethers/viem, Wagmi).
- Integration DEX standard (Uniswap/Sushiswap V2) plus simple a demontrer.
- Outils de debug/test tres solides pour garantir un prototype stable en 5 semaines.
- Testnet public gratuit.

### 2) Modele d'actifs: ERC-20 + ERC-721 en parallele

**Decision**: supporter simultanement:
- un token fongible (ERC-20) pour la fractionalisation d'un actif immobilier,
- un NFT (ERC-721) pour representer un actif unique (ex: titre de propriete).

**Justification**:
- Le sujet demande de supporter les deux types de tokenisation.
- Le systeme n'impose pas qu'ils soient mutuellement exclusifs.
- Ce choix permet de demontrer deux usages complementaires:
  - **liquidite/investissement fractionne** via ERC-20,
  - **unicite/propriete numerique** via ERC-721.

### 3) Compliance enforcee on-chain (pas seulement UI)

**Decision**: centraliser KYC whitelist/blacklist dans `ComplianceRegistry.sol` puis appliquer les controles dans les contrats de token et de trading.

**Justification**:
- Le requirement impose explicitement une enforcement on-chain.
- Meme en contournant le frontend, les adresses non conformes ne peuvent pas transferer/trader.

### 4) Trading: marketplace + pool + DEX externe

**Decision**: proposer trois chemins de trading:
- marketplace ERC-20,
- marketplace NFT,
- pool AMM + integration Uniswap/Sushiswap V2.

**Justification**:
- Couvre le requirement de tradabilite on-chain.
- Permet de montrer differents mecanismes de marche (order-like listing vs AMM).
- Renforce la credibilite de la demo avec des swaps possibles hors UI.

### 5) Indexer event-driven pour la synchro reel/on-chain

**Decision**: indexer backend (cron 60s) qui lit les events on-chain et hydrate SQLite/API.

**Justification**:
- Repond au requirement de real-time awareness.
- Les actions faites hors UI (ex: swap direct sur DEX) sont visibles dans l'application.

### 6) Oracle on-chain + service de mise a jour

**Decision**: utiliser `PriceOracle.sol` et un service backend periodique qui pousse les prix on-chain.

**Justification**:
- Repond explicitement au requirement Oracle.
- Permet d'afficher une logique de pricing exploitable dans l'app (prix, confiance, stale check).

### 7) Architecture full-stack choisie

**Decision**:
- Smart contracts Solidity (Hardhat),
- backend Node/Express + SQLite (indexer/oracle/API),
- frontend Next.js + Wagmi.

**Justification**:
- Stack TypeScript/JavaScript homogene (vitesse de dev).
- Facile a deployer et a presenter (local + hosting frontend simple).
- Suffisamment modulaire pour separer proprement contrats, indexation et UI.

---

## Conformite au sujet final (checklist)

### 1) Tokenisation des RWA
- **Fungible token**: `PropertyToken.sol` (ERC-20) pour parts de proprietes — 6 tokens deployes (PAR7E, LYONC, NICEV, BDXCH, PAR16, TLSCT).
- **Non-fungible token**: `PropertyNFT.sol` (ERC-721, symbole TIMMO) pour actifs uniques (titres de propriete, oeuvres d'art, collectibles).
- Actif choisi: immobilier tokenise (RWA reel).

### 2) Compliance on-chain (KYC + whitelist + blacklist)
- `ComplianceRegistry.sol` implemente whitelist/blacklist + timestamp KYC.
- Enforcement **on-chain** dans `_update()` de `PropertyToken.sol` et `PropertyNFT.sol`.
- Les swaps/trades exigent aussi `isCompliant(msg.sender)` dans les marketplaces/pool.
- Interface admin pour gerer les adresses (page `/admin`).

### 3) Trading on-chain + DEX
- Marketplace on-chain ERC-20: `PropertyMarketplace.sol` (fee configurable, defaut 1%, max 5%).
- Marketplace on-chain NFT: `NFTMarketplace.sol` (fee configurable, defaut 1%, max 5%).
- Pool AMM interne: `TokenSwapPool.sol` (fee 0.3%, formule x*y=k).
- **Integration explicite Uniswap/Sushiswap V2**:
  - Backend quote/pair endpoints: `GET /api/marketplace/dex/quote`, `GET /api/marketplace/dex/pair`
  - Frontend swap via router V2 (Uniswap/Sushiswap) sur la page `/swap`
  - Script setup liquidite/pair: `blockchain/scripts/setup-uniswap-v2.js`

### 4) Real-time on-chain awareness (Indexer)
- Indexer cron (chaque minute) qui sync les events on-chain vers SQLite.
- Indexation des events de compliance, achats, listings, pool swaps, oracle.
- Indexation des swaps **Uniswap/Sushiswap V2 pair** (event `Swap`) pour remonter les operations faites hors UI.

### 5) Oracle
- `PriceOracle.sol` on-chain (price, confidence, stale check).
- Service backend `oracle.js` qui pousse des updates on-chain toutes les 5 min.
- API et affichage frontend du prix + historique.

---

## Smart Contracts

### ComplianceRegistry.sol — KYC on-chain

Registre centralise de conformite KYC avec whitelist et blacklist. Utilise par tous les autres contrats pour verifier la conformite des adresses.

| Fonction | Description |
|----------|-------------|
| `addToWhitelist(address)` | Ajouter une adresse a la whitelist |
| `batchWhitelist(address[])` | Whitelist par lot |
| `removeFromWhitelist(address)` | Retirer de la whitelist |
| `addToBlacklist(address)` | Blacklister une adresse (override whitelist) |
| `removeFromBlacklist(address)` | Retirer de la blacklist |
| `isCompliant(address)` | Verifie whitelist ET non-blacklist |

**Events**: `AddressWhitelisted`, `AddressBlacklisted`, `AddressRemovedFromWhitelist`, `AddressRemovedFromBlacklist`
**Access**: Owner only (via OpenZeppelin `Ownable`)

### PropertyToken.sol — ERC-20 fractionne

Token fongible representant des parts de propriete immobiliere. Chaque bien a son propre contrat PropertyToken avec un symbole unique.

| Fonction | Description |
|----------|-------------|
| `buyTokens(uint256 amount)` | Acheter des tokens au prix fixe (payable en ETH) |
| `setTokenPrice(uint256 newPrice)` | Mettre a jour le prix (owner) |
| `availableTokens()` | Tokens restants a l'achat |
| `_update()` | Override pour enforcement compliance |

**6 instances deployees**:

| Symbole | Bien | Ville | Tokens | Prix EUR |
|---------|------|-------|--------|----------|
| PAR7E | Appartement Haussmannien | Paris 7e | 1 000 | 520 000 |
| LYONC | Loft Moderne Confluence | Lyon | 760 | 380 000 |
| NICEV | Villa Vue Mer | Nice | 1 780 | 890 000 |
| BDXCH | Local Commercial Chartrons | Bordeaux | 620 | 310 000 |
| PAR16 | Penthouse | Paris 16e | 2 500 | 1 250 000 |
| TLSCT | Maison de Ville Capitole | Toulouse | 840 | 420 000 |

**Events**: `TokensPurchased`, `TokenPriceUpdated`
**Inheritance**: `ERC20` + `Ownable` (OpenZeppelin)

### PropertyNFT.sol — ERC-721 actifs uniques

NFT representant des actifs immobiliers uniques (titres de propriete, oeuvres d'art, collectibles). Symbole: TIMMO.

| Fonction | Description |
|----------|-------------|
| `mintAsset(to, assetType, location, uri, valuationWei, propertyId)` | Mint un NFT avec metadata |
| `updateValuation(tokenId, newValuation)` | Mettre a jour la valorisation |
| `totalMinted()` | Nombre total de NFTs mintes |

**Metadata on-chain par NFT**: `assetType`, `location`, `valuationWei`, `mintedAt`, `propertyId`
**Events**: `NFTMinted`, `NFTValuationUpdated`
**Inheritance**: `ERC721` + `ERC721URIStorage` + `Ownable`

### PropertyMarketplace.sol — Marketplace ERC-20

Marketplace P2P on-chain pour echanger des tokens de proprietes entre utilisateurs whitelistes.

| Fonction | Description |
|----------|-------------|
| `createListing(tokenAddress, amount, pricePerToken)` | Creer une offre de vente |
| `buyListing(listingId)` | Acheter des tokens d'une offre |
| `cancelListing(listingId)` | Annuler une offre (vendeur) |
| `setFee(feeBps)` | Modifier les frais (owner, max 5%) |

**Events**: `ListingCreated`, `ListingSold`, `ListingCancelled`, `FeeUpdated`
**Frais**: Defaut 1% (100 bps), max 5% (500 bps)

### NFTMarketplace.sol — Marketplace ERC-721

Marketplace P2P on-chain pour echanger des NFTs entre utilisateurs whitelistes.

| Fonction | Description |
|----------|-------------|
| `createListing(nftContract, tokenId, price)` | Lister un NFT a la vente |
| `buyListing(listingId)` | Acheter un NFT |
| `cancelListing(listingId)` | Annuler un listing (vendeur) |
| `setFee(feeBps)` | Modifier les frais (owner, max 5%) |

**Events**: `NFTListed`, `NFTSold`, `NFTListingCancelled`, `FeeUpdated`
**Frais**: Defaut 1% (100 bps), max 5% (500 bps)

### TokenSwapPool.sol — Pool AMM (x*y=k)

Pool de liquidite AMM inspire de Uniswap V2 pour swapper des PropertyTokens contre de l'ETH. Formule de prix constant (x*y=k).

| Fonction | Description |
|----------|-------------|
| `addLiquidity(tokenAmount)` | Fournir liquidite + recevoir LP tokens |
| `removeLiquidity(lpAmount)` | Retirer liquidite |
| `swapETHForToken()` | Swapper ETH → tokens |
| `swapTokenForETH(tokenIn)` | Swapper tokens → ETH |
| `getTokenOutForETH(ethIn)` | Estimation output (view) |
| `getETHOutForToken(tokenIn)` | Estimation output (view) |
| `getSpotPrice()` | Prix spot actuel (view) |

**Events**: `LiquidityAdded`, `LiquidityRemoved`, `SwapETHForToken`, `SwapTokenForETH`
**Fee**: 0.3% (30 bps) par swap

### PriceOracle.sol — Oracle de prix on-chain

Oracle de prix centralise pour les actifs tokenises. Le backend pousse des mises a jour periodiques on-chain.

| Fonction | Description |
|----------|-------------|
| `updatePrice(token, price, confidence)` | Mettre a jour le prix (owner) |
| `batchUpdatePrices(tokens[], prices[], confidences[])` | MAJ par lot |
| `getPrice(token)` | Lire prix, timestamp, confiance (view) |
| `isPriceStale(token, maxAge)` | Verifier obsolescence (view) |
| `getAllRegisteredTokens()` | Liste des tokens enregistres |

**Donnees stockees**: prix (wei, 18 decimales), timestamp (`block.timestamp`), confiance (0-10000 bps)
**Events**: `PriceUpdated`, `TokenRegistered`

---

## Backend — API REST + Indexer + Oracle

### Stack

- **Runtime**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3, mode WAL)
- **Blockchain**: ethers.js v6
- **Scheduler**: node-cron
- **Port**: 3001

### Schema de base de donnees (SQLite)

| Table | Description |
|-------|-------------|
| `properties` | Biens immobiliers (titre, ville, prix, tokens, rendement, images, statut) |
| `users` | Comptes KYC (wallet, whitelist, blacklist, timestamp) |
| `transactions` | Transactions blockchain (type, hash, from, to, montant, swap_direction) |
| `marketplace_listings` | Offres de vente tokens (vendeur, montant, prix, statut) |
| `nfts` | NFTs mintes (tokenId, owner, type, localisation, valorisation, propertyId) |
| `nft_listings` | Offres de vente NFTs (vendeur, tokenId, prix, statut) |
| `oracle_prices` | Historique des prix oracle (token, prix, confiance, source) |
| `indexer_state` | Etat de l'indexer (dernier bloc traite) |

### API Endpoints

#### Proprietes
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/properties` | Liste des proprietes (filtres: city, type, status, prix min/max, tri) |
| GET | `/api/properties/featured` | Top 4 proprietes mises en avant |
| GET | `/api/properties/:id` | Detail d'une propriete avec donnees NFT |
| POST | `/api/properties` | Creer une propriete |
| GET | `/api/properties/:id/token-info` | Donnees token on-chain (supply, prix, balance) |

#### Compliance / KYC
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/compliance/status/:address` | Statut KYC d'une adresse |
| POST | `/api/compliance/whitelist` | Whitelister une adresse (on-chain + DB) |
| POST | `/api/compliance/whitelist/batch` | Whitelist par lot |
| POST | `/api/compliance/blacklist` | Blacklister une adresse |
| DELETE | `/api/compliance/whitelist/:address` | Retirer de la whitelist |
| DELETE | `/api/compliance/blacklist/:address` | Retirer de la blacklist |
| GET | `/api/compliance/users` | Liste des utilisateurs KYC |

#### Marketplace
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/marketplace/listings` | Listings actifs (avec donnees propriete) |
| GET | `/api/marketplace/listings/all` | Tous les listings (inclut vendus/annules) |
| GET | `/api/marketplace/listings/seller/:address` | Listings d'un vendeur |
| GET | `/api/marketplace/listings/:id` | Detail d'un listing (on-chain) |
| GET | `/api/marketplace/pool` | Reserves + prix spot du pool AMM |
| GET | `/api/marketplace/pool/quote` | Estimation de swap (direction + montant) |
| GET | `/api/marketplace/dex/pair` | Reserves de la pair Uniswap/SushiSwap V2 |
| GET | `/api/marketplace/dex/quote` | Estimation de swap via DEX V2 |

#### Transactions
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/transactions` | Historique (filtres: type, address, limit) |
| POST | `/api/transactions` | Enregistrer une transaction |
| GET | `/api/transactions/hash/:txHash` | Transaction par hash |
| GET | `/api/transactions/address/:address` | Transactions d'une adresse |

#### Oracle
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/oracle/price/:tokenAddress` | Prix actuel (lu on-chain) |
| GET | `/api/oracle/prices` | Tous les prix enregistres |
| GET | `/api/oracle/history/:tokenAddress` | Historique des prix (limit=50) |

#### NFTs
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/nfts` | Liste des NFTs (avec donnees propriete) |
| GET | `/api/nfts/listings` | Listings NFT actifs |
| GET | `/api/nfts/listings/all` | Tous les listings NFT |
| GET | `/api/nfts/:tokenId` | Detail d'un NFT (DB + fallback on-chain) |
| POST | `/api/nfts/mint` | Mint un NFT (admin) |

#### Contrats
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/contracts` | Adresses des contrats deployes |
| GET | `/api/contracts/abis` | Tous les ABIs |
| GET | `/api/contracts/abis/:name` | ABI d'un contrat specifique |

#### Sante
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Etat du backend + block actuel |

---

## Indexer — Real-Time On-Chain Awareness

### Objectif

L'indexer garantit que le frontend reflete **l'etat reel de la blockchain** en permanence. Meme si un utilisateur effectue un swap directement sur le DEX (par exemple via Etherscan ou un autre outil, sans passer par notre UI), le changement sera detecte et affiche dans l'application.

### Architecture

```
Blockchain (Sepolia / Hardhat)
    │
    │  Events emis par les smart contracts
    │  (AddressWhitelisted, TokensPurchased, SwapETHForToken, PriceUpdated, ...)
    │
    ▼
┌──────────────────────────────┐
│     INDEXER (backend)        │
│  services/indexer.js         │
│                              │
│  - Tourne toutes les 60s    │
│    (cron: "* * * * *")      │
│  - Scanne les nouveaux blocs│
│  - Parse les events des     │
│    7 smart contracts +      │
│    pairs DEX externes       │
│  - Sauvegarde en SQLite     │
│  - Gere les limites RPC     │
│    (batches de 10 blocs)    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     BASE DE DONNEES          │
│     SQLite (tokenimmo.db)    │
│                              │
│  8 tables mises a jour :    │
│  - users                    │
│  - transactions             │
│  - marketplace_listings     │
│  - nfts                     │
│  - nft_listings             │
│  - oracle_prices            │
│  - properties               │
│  - indexer_state            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     API REST (Express)       │
│  7 groupes de routes         │
│  Port 3001                   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     FRONTEND (Next.js)       │
│  4 Context providers         │
│  Polling toutes les 60s      │
└──────────────────────────────┘
```

### Events indexes

| Contrat | Events |
|---------|--------|
| ComplianceRegistry | `AddressWhitelisted`, `AddressBlacklisted`, `AddressRemovedFromWhitelist`, `AddressRemovedFromBlacklist` |
| PropertyToken | `TokensPurchased` |
| PropertyMarketplace | `ListingCreated`, `ListingSold`, `ListingCancelled` |
| NFTMarketplace | `NFTListed`, `NFTSold`, `NFTListingCancelled` |
| TokenSwapPool | `SwapETHForToken`, `SwapTokenForETH` |
| PriceOracle | `PriceUpdated` |
| Uniswap/SushiSwap V2 Pair | `Swap` (operations DEX externes) |

### Fonctionnement technique

1. **Reprise apres arret**: L'indexer stocke le dernier bloc scanne dans `indexer_state`. Au redemarrage, il reprend exactement ou il s'est arrete.
2. **Batches de 10 blocs**: Pour respecter les limites RPC gratuits (Alchemy free tier), les requetes `eth_getLogs` sont decoupees par tranches.
3. **Idempotence**: Utilise `INSERT OR IGNORE` pour eviter les doublons. Les transactions sont identifiees par `tx_hash` unique.
4. **Mise a jour cross-tables**: Un achat de token met a jour `transactions` ET `properties.tokens_sold`. La vente d'un NFT met a jour `nft_listings`, `nfts.owner_address` et `transactions`.

### Scenario : swap hors UI

```
1. Un utilisateur appelle swapETHForToken() directement sur Etherscan
2. Le contrat TokenSwapPool emet l'event SwapETHForToken(user, ethIn, tokenOut)
3. L'indexer detecte cet event au prochain scan (~60s max)
4. Il insere une transaction de type "swap" dans la DB
5. Le frontend fetch GET /api/transactions et affiche le swap
```

---

## Oracle — On-Chain Price Feed

### Architecture

```
┌──────────────────────────────┐
│   SOURCE DE PRIX             │
│   (simulation de marche)     │
│                              │
│   En production :            │
│   CoinGecko, Chainlink,     │
│   API immobiliere            │
│                              │
│   Ici : random walk ±5%     │
│   autour du prix de base    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   ORACLE SERVICE (backend)   │
│   services/oracle.js         │
│   Tourne toutes les 5 min   │
│   (cron: "*/5 * * * *")     │
│                              │
│   → Calcule nouveau prix    │
│   → Envoie tx on-chain      │
│   → Stocke en SQLite        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   PriceOracle.sol            │
│                              │
│   mapping(token => {         │
│     price, updatedAt,        │
│     confidence               │
│   })                         │
│                              │
│   isPriceStale(token, age)   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   FRONTEND (page /swap)      │
│                              │
│   Prix actuel en ETH         │
│   Confiance (%)              │
│   Date de derniere MAJ       │
│   Historique des prix        │
└──────────────────────────────┘
```

### Details techniques

- **Prix**: Stocke en wei (18 decimales) pour la precision maximale.
- **Confiance**: En basis points (10000 = 100%). Indique la fiabilite de la source.
- **Staleness**: `isPriceStale(token, maxAge)` retourne `true` si le prix n'a pas ete mis a jour depuis `maxAge` secondes.
- **Batch**: `batchUpdatePrices()` permet de mettre a jour plusieurs tokens en une transaction.
- **Securite**: Seul le owner (operateur oracle) peut mettre a jour les prix. Les prix a 0 et adresses invalides sont rejetes.

---

## Frontend — Interface Utilisateur

### Stack

| Technologie | Version | Role |
|-------------|---------|------|
| Next.js | 16 | Framework React (App Router) |
| React | 19 | UI library |
| TypeScript | 5 | Typage statique |
| Tailwind CSS | 4 | Styling |
| Wagmi | 2 | Hooks Web3 (lecture/ecriture contrats) |
| Viem | 2 | Client Ethereum |
| RainbowKit | 2 | Connexion wallet (MetaMask, WalletConnect) |
| NextAuth | 5 beta | Authentification (sessions JWT) |
| React Query | 5 | Cache API asynchrone |
| Zod | 4 | Validation de formulaires |
| react-hook-form | 7 | Gestion formulaires |
| date-fns | 4 | Formatage dates |

### Pages

| Route | Description |
|-------|-------------|
| `/` | Accueil : hero, statistiques, fonctionnement, proprietes en vedette, CTA |
| `/properties` | Catalogue des biens avec filtres (ville, type, prix, surface, rendement, tri) et pagination |
| `/properties/[id]` | Detail d'un bien : images, description, financials, formulaire d'achat de tokens |
| `/properties/new` | Creation d'un nouveau bien tokenise |
| `/marketplace` | Marche secondaire : listings actifs, mes offres, historique (3 onglets) |
| `/nfts` | Galerie NFT TIMMO avec listings actifs |
| `/nfts/[tokenId]` | Detail d'un NFT : metadata, valorisation, owner, bouton d'achat |
| `/swap` | Swap tokens/ETH : pool interne OU DEX Uniswap/SushiSwap V2, prix oracle en temps reel |
| `/portfolio` | Portefeuille : resume (valeur, gains, rendement, revenus), liste des holdings |
| `/transactions` | Historique complet des transactions avec filtres |
| `/admin` | Administration : gestion KYC (whitelist/blacklist), mint de NFTs |
| `/auth/signin` | Connexion (wallet + email/password) |
| `/auth/signup` | Inscription |

### State Management

Le frontend utilise 4 React Context providers imbriques pour gerer l'etat global :

```
WagmiProvider (Web3)
  └── QueryClientProvider (React Query)
      └── RainbowKitProvider (Wallet UI)
          └── SessionProvider (NextAuth)
              └── PropertyProvider
                  └── PortfolioProvider
                      └── TransactionProvider
                          └── MarketplaceProvider
                              └── {children}
```

- **PropertyContext**: Proprietes, filtres multi-criteres, pagination, polling 60s
- **PortfolioContext**: Holdings agregees depuis les transactions confirmees, stats (valeur totale, gains, rendement, revenu mensuel)
- **TransactionContext**: Transactions blockchain, persistance backend, detection direction swap
- **MarketplaceContext**: Listings actifs/vendus/annules, donnees propriete enrichies

### Interactions blockchain (Wagmi)

Le frontend interagit directement avec les smart contracts via les hooks Wagmi :

- `useReadContract`: Lecture de `isCompliant()`, `tokenPrice`, `balanceOf()`, `getSpotPrice()`, etc.
- `useWriteContract`: Appels `buyTokens()`, `createListing()`, `buyListing()`, `swapETHForToken()`, `swapTokenForETH()`, `approve()`, etc.
- `useAccount`: Adresse wallet connectee
- `useBalance`: Solde ETH

### Conversion des prix

- **ETH/EUR**: Hook `useETHPrice` qui requete CoinGecko avec cache localStorage 5 min (fallback: 2500 EUR/ETH)
- **Wei → ETH**: Utilisation de `viem.formatEther()`
- **Affichage**: Formatage EUR (locale fr-FR) et ETH (micro-ETH pour petits montants)

---

## Integration explicite Uniswap/Sushiswap V2

### Variables d'environnement

Backend (`backend/.env`) :

```bash
UNISWAP_V2_ROUTER_ADDRESS=0x...
UNISWAP_V2_FACTORY_ADDRESS=0x...
SUSHISWAP_V2_ROUTER_ADDRESS=0x...
SUSHISWAP_V2_FACTORY_ADDRESS=0x...
WETH_ADDRESS=0x...
```

Frontend (`frontend/.env.local`) :

```bash
NEXT_PUBLIC_UNISWAP_V2_ROUTER=0x...
NEXT_PUBLIC_UNISWAP_V2_FACTORY=0x...
NEXT_PUBLIC_SUSHISWAP_V2_ROUTER=0x...
NEXT_PUBLIC_SUSHISWAP_V2_FACTORY=0x...
NEXT_PUBLIC_WETH_ADDRESS=0x...
```

### Setup pair + liquidite (Sepolia)

```bash
cd blockchain
npm run setup:uniswap:sepolia
```

Ce script:
- Approve le router Uniswap V2 pour depenser les tokens.
- Ajoute de la liquidite `PAR7E/WETH` via `addLiquidityETH()`.
- Recupere l'adresse de pair depuis la factory.
- Whitelist la pair dans `ComplianceRegistry` (necessaire pour respecter la logique KYC on-chain de `PropertyToken`).

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5, Hardhat |
| Backend | Node.js, Express.js, ethers.js 6, better-sqlite3, node-cron |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| Web3 | Wagmi 2, Viem 2, RainbowKit 2 |
| Auth | NextAuth 5 (Credentials + JWT) |
| Validation | Zod 4, react-hook-form 7 |
| Testnet | Ethereum Sepolia (chainId 11155111) |

---

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

# 2. Deployer les 7 contrats + 6 PropertyTokens + demo data
cd blockchain && npx hardhat run scripts/deploy.js --network sepolia

# 3. Synchroniser les adresses vers le frontend
node scripts/sync-addresses.js

# 4. Lancer le backend (indexer + oracle demarrent automatiquement)
cd ../backend && npm run seed && npm run dev

# 5. Lancer le frontend
cd ../frontend && npm run dev
```

### Lancement local (Hardhat)

```bash
./start-dev.sh
```

Ce script:
1. Demarre un noeud Hardhat local (port 8545)
2. Deploie tous les contrats + demo data
3. Met a jour les adresses dans `frontend/.env.local`
4. Reset l'indexer et les donnees stale
5. Seed la base de donnees
6. Demarre le backend (port 3001)
7. Demarre le frontend (port 3000)

### Utilisation

1. Ouvrir http://localhost:3000
2. Connecter MetaMask au reseau Sepolia (chainId 11155111) ou Hardhat (31337)
3. Aller sur `/admin` pour whitelister votre adresse
4. Acheter des tokens sur la page d'un bien (`/properties/[id]`)
5. Swapper des tokens sur `/swap` (prix oracle affiche en temps reel)
6. Creer des offres sur `/marketplace`
7. Consulter les NFTs sur `/nfts`
8. Verifier le portefeuille sur `/portfolio`
9. Les transactions apparaissent dans `/transactions` meme apres un refresh (persistees en DB)

### Diagnostic

```bash
cd backend && node diagnose.js
```

Verifie : connexion RPC, wallet, contrats on-chain (bytecode + state), config frontend, etat de la DB et de l'indexer.

---

## Demo Sepolia faible cout (< 0.02 ETH)

Pour les soutenances avec peu de fonds faucet, le projet supporte un profil de deploiement low-cost.

### Option 1 — Script npm preconfigure

```bash
cd blockchain
npm run deploy:sepolia:lowcost
```

Ce profil applique:
- `ETH_EUR_RATE=250000` (tokens ~100x moins chers que le profil standard),
- `NFT_LISTING_PRICE_ETH=0.003`,
- `INITIAL_LIQUIDITY_TOKENS=2`,
- `DEMO_LISTING_TOKENS=2`.

### Option 2 — Ajustement fin via variables d'environnement

```bash
cd blockchain
ETH_EUR_RATE=300000 \
NFT_LISTING_PRICE_ETH=0.002 \
INITIAL_LIQUIDITY_TOKENS=1 \
INITIAL_LIQUIDITY_ETH=0.002 \
DEMO_LISTING_TOKENS=1 \
npx hardhat run scripts/deploy.js --network sepolia
```

Variables supportees par `scripts/deploy.js`:
- `ETH_EUR_RATE`: base de calcul du prix token (dans `properties-config.js`),
- `NFT_LISTING_PRICE_ETH`: force le prix des NFTs listes pendant le deploy,
- `INITIAL_LIQUIDITY_TOKENS`: quantite de tokens injectes dans `TokenSwapPool`,
- `INITIAL_LIQUIDITY_ETH`: override explicite de l'ETH injecte dans le pool,
- `DEMO_LISTING_TOKENS`: quantite de tokens mises en vente sur le marketplace.

### Budget de demo recommande

- Deploy contrats: ~0.008–0.012 ETH (selon congestion)
- 1 achat token + 1 achat NFT live: ~0.003–0.006 ETH
- Marge securite: ~0.003 ETH
- **Total cible**: ~0.015–0.02 ETH

Conseil demo: executer toutes les operations de setup avant la soutenance, puis ne faire que 1–2 transactions live.

---

## Scripts disponibles

### Blockchain (`cd blockchain`)

| Commande | Description |
|----------|-------------|
| `npm run compile` | Compiler les smart contracts |
| `npm test` | Lancer les tests unitaires |
| `npm run deploy:local` | Deployer sur Hardhat local |
| `npm run deploy:sepolia` | Deployer sur Sepolia |
| `npm run deploy:sepolia:lowcost` | Deployer sur Sepolia (profil low-cost) |
| `npm run setup:uniswap:sepolia` | Creer pair + liquidite Uniswap V2 |
| `npm run node` | Demarrer un noeud Hardhat local |

### Backend (`cd backend`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Demarrer en mode dev (hot reload) |
| `npm start` | Demarrer en production |
| `npm run seed` | Peupler la base de donnees |
| `npm run indexer` | Lancer l'indexer manuellement |
| `node diagnose.js` | Diagnostic complet |

### Frontend (`cd frontend`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Demarrer en mode dev |
| `npm run build` | Build de production |
| `npm start` | Servir le build |
| `npm run lint` | Linter ESLint |

---

## Variables d'environnement

### blockchain/.env

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/VOTRE_CLE
DEPLOYER_PRIVATE_KEY=VOTRE_CLE_PRIVEE
```

### backend/.env

```bash
PORT=3001
FRONTEND_URL=http://localhost:3000
RPC_URL=http://127.0.0.1:8545          # ou URL Sepolia
DEPLOYER_PRIVATE_KEY=VOTRE_CLE_PRIVEE
UNISWAP_V2_ROUTER_ADDRESS=0x...
UNISWAP_V2_FACTORY_ADDRESS=0x...
SUSHISWAP_V2_ROUTER_ADDRESS=0x...
SUSHISWAP_V2_FACTORY_ADDRESS=0x...
WETH_ADDRESS=0x...
```

### frontend/.env.local

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
NEXT_PUBLIC_ALCHEMY_ID=your-alchemy-id
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_COMPLIANCE_REGISTRY=0x...
NEXT_PUBLIC_PRICE_ORACLE=0x...
NEXT_PUBLIC_PROPERTY_TOKEN=0x...
NEXT_PUBLIC_PROPERTY_NFT=0x...
NEXT_PUBLIC_PROPERTY_MARKETPLACE=0x...
NEXT_PUBLIC_NFT_MARKETPLACE=0x...
NEXT_PUBLIC_TOKEN_SWAP_POOL=0x...
NEXT_PUBLIC_UNISWAP_V2_ROUTER=0x...
NEXT_PUBLIC_UNISWAP_V2_FACTORY=0x...
NEXT_PUBLIC_SUSHISWAP_V2_ROUTER=0x...
NEXT_PUBLIC_SUSHISWAP_V2_FACTORY=0x...
NEXT_PUBLIC_WETH_ADDRESS=0x...
```

---

## Livrables demandes

- ⬜ Frontend heberge (URL de prod testnet): `https://...`
- ⬜ Repo GitHub public (single repo): `https://github.com/...`
- ✅ Code source complet (7 smart contracts + backend + frontend)
- ✅ README technique + choix de design
- ⬜ Demo presentation (tokenization + compliance + trading + oracle + sync on-chain)
