#!/bin/bash
# TokenImmo — Full stack development startup script
# Starts: Hardhat node, deploys contracts, seeds DB, starts backend, starts frontend

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== TokenImmo Development Environment ==="
echo ""

# 1. Start Hardhat local node
echo "[1/5] Starting Hardhat local node..."
cd "$PROJECT_ROOT/blockchain"
npx hardhat node &
HARDHAT_PID=$!
sleep 3

# 2. Deploy contracts
echo "[2/5] Deploying smart contracts..."
npx hardhat run scripts/deploy.js --network localhost

# 3. Update frontend .env with deployed addresses
echo "[3/5] Updating contract addresses..."
if [ -f "$PROJECT_ROOT/blockchain/deployed-addresses.json" ]; then
  ADDRESSES=$(cat "$PROJECT_ROOT/blockchain/deployed-addresses.json")

  COMPLIANCE=$(echo "$ADDRESSES" | grep -o '"ComplianceRegistry": "[^"]*"' | cut -d'"' -f4)
  ORACLE=$(echo "$ADDRESSES" | grep -o '"PriceOracle": "[^"]*"' | cut -d'"' -f4)
  TOKEN=$(echo "$ADDRESSES" | grep -o '"PropertyToken_PAR7E": "[^"]*"' | cut -d'"' -f4)
  NFT=$(echo "$ADDRESSES" | grep -o '"PropertyNFT": "[^"]*"' | cut -d'"' -f4)
  MARKETPLACE=$(echo "$ADDRESSES" | grep -o '"PropertyMarketplace": "[^"]*"' | cut -d'"' -f4)
  NFT_MARKETPLACE=$(echo "$ADDRESSES" | grep -o '"NFTMarketplace": "[^"]*"' | cut -d'"' -f4)
  SWAP=$(echo "$ADDRESSES" | grep -o '"TokenSwapPool": "[^"]*"' | cut -d'"' -f4)

  # Update frontend .env.local
  sed -i "s|NEXT_PUBLIC_COMPLIANCE_REGISTRY=.*|NEXT_PUBLIC_COMPLIANCE_REGISTRY=$COMPLIANCE|" "$PROJECT_ROOT/frontend/.env.local"
  sed -i "s|NEXT_PUBLIC_PRICE_ORACLE=.*|NEXT_PUBLIC_PRICE_ORACLE=$ORACLE|" "$PROJECT_ROOT/frontend/.env.local"
  sed -i "s|NEXT_PUBLIC_PROPERTY_TOKEN=.*|NEXT_PUBLIC_PROPERTY_TOKEN=$TOKEN|" "$PROJECT_ROOT/frontend/.env.local"
  sed -i "s|NEXT_PUBLIC_PROPERTY_NFT=.*|NEXT_PUBLIC_PROPERTY_NFT=$NFT|" "$PROJECT_ROOT/frontend/.env.local"
  sed -i "s|NEXT_PUBLIC_PROPERTY_MARKETPLACE=.*|NEXT_PUBLIC_PROPERTY_MARKETPLACE=$MARKETPLACE|" "$PROJECT_ROOT/frontend/.env.local"
  sed -i "s|NEXT_PUBLIC_NFT_MARKETPLACE=.*|NEXT_PUBLIC_NFT_MARKETPLACE=$NFT_MARKETPLACE|" "$PROJECT_ROOT/frontend/.env.local"
  sed -i "s|NEXT_PUBLIC_TOKEN_SWAP_POOL=.*|NEXT_PUBLIC_TOKEN_SWAP_POOL=$SWAP|" "$PROJECT_ROOT/frontend/.env.local"

  echo "  Contract addresses written to frontend/.env.local"
fi

# 3b. Reset indexer & stale listings (fresh Hardhat node = block 0, IDs restart)
echo "  Resetting indexer and stale on-chain data..."
cd "$PROJECT_ROOT/backend"
node -e "
const { getDb } = require('./src/db/database');
const db = getDb();
db.prepare(\"UPDATE indexer_state SET value = '0' WHERE key = 'last_block'\").run();
db.prepare('DELETE FROM marketplace_listings').run();
db.prepare('DELETE FROM nft_listings').run();
db.prepare(\"DELETE FROM transactions WHERE type IN ('purchase','listing_sold','swap')\").run();
console.log('  Indexer reset, stale listings cleared');
"

# 4. Seed database & start backend
echo "[4/5] Seeding database & starting backend..."
cd "$PROJECT_ROOT/backend"
node src/db/seed.js
node src/index.js &
BACKEND_PID=$!
sleep 2

# 5. Start frontend
echo "[5/5] Starting frontend..."
cd "$PROJECT_ROOT/frontend"
npx next dev &
FRONTEND_PID=$!

echo ""
echo "=== TokenImmo is running ==="
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001/api"
echo "  Hardhat:   http://localhost:8545"
echo ""
echo "  Press Ctrl+C to stop all services"

# Wait and cleanup
trap "kill $HARDHAT_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
