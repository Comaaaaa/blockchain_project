/**
 * Sync deployed contract addresses to frontend .env.local
 * Run after deploy: node scripts/sync-addresses.js
 */
const fs = require("fs");
const path = require("path");

const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
const envPath = path.join(__dirname, "..", "..", "frontend", ".env.local");

if (!fs.existsSync(addressesPath)) {
  console.error("deployed-addresses.json not found. Run deploy first.");
  process.exit(1);
}

const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

// Read current .env.local
let envContent = fs.readFileSync(envPath, "utf-8");

// Map deployed addresses to env var names
const mapping = {
  ComplianceRegistry: "NEXT_PUBLIC_COMPLIANCE_REGISTRY",
  PriceOracle: "NEXT_PUBLIC_PRICE_ORACLE",
  PropertyToken_PAR7E: "NEXT_PUBLIC_PROPERTY_TOKEN",
  PropertyNFT: "NEXT_PUBLIC_PROPERTY_NFT",
  PropertyMarketplace: "NEXT_PUBLIC_PROPERTY_MARKETPLACE",
  TokenSwapPool: "NEXT_PUBLIC_TOKEN_SWAP_POOL",
  NFTMarketplace: "NEXT_PUBLIC_NFT_MARKETPLACE",
};

let updated = 0;
for (const [deployKey, envVar] of Object.entries(mapping)) {
  if (!addresses[deployKey]) continue;
  const regex = new RegExp(`^${envVar}=.*$`, "m");
  const newLine = `${envVar}=${addresses[deployKey]}`;
  if (regex.test(envContent)) {
    const oldLine = envContent.match(regex)[0];
    if (oldLine !== newLine) {
      envContent = envContent.replace(regex, newLine);
      console.log(`Updated ${envVar}: ${addresses[deployKey]}`);
      updated++;
    }
  }
}

fs.writeFileSync(envPath, envContent);
console.log(`\nDone. ${updated} address(es) updated in frontend/.env.local`);
