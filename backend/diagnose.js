require("dotenv").config();
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

async function diagnose() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     DIAGNOSTIC CONNEXION BLOCKCHAIN - TOKENIMMO     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // 1. RPC Connection
  console.log("--- 1. CONNEXION RPC ---");
  const rpcUrl = process.env.RPC_URL;
  console.log("RPC URL:", rpcUrl ? rpcUrl.slice(0, 45) + "..." : "NON CONFIGURE");

  let provider;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log("Reseau:", network.name, "(chainId:", network.chainId.toString() + ")");
    console.log("Block actuel:", blockNumber);
    console.log("=> RPC OK\n");
  } catch (e) {
    console.log("=> RPC ERREUR:", e.message, "\n");
    return;
  }

  // 2. Deployer wallet
  console.log("--- 2. WALLET DEPLOYER ---");
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (pk) {
    try {
      const wallet = new ethers.Wallet(pk, provider);
      const balance = await provider.getBalance(wallet.address);
      console.log("Adresse:", wallet.address);
      console.log("Balance:", ethers.formatEther(balance), "ETH");
      console.log("=> WALLET OK\n");
    } catch (e) {
      console.log("=> WALLET ERREUR:", e.message, "\n");
    }
  } else {
    console.log("=> DEPLOYER_PRIVATE_KEY non configure\n");
  }

  // 3. Contract addresses
  console.log("--- 3. CONTRATS DEPLOYES ---");
  const addressesPath = path.join(__dirname, "..", "blockchain", "deployed-addresses.json");
  let addresses;
  try {
    addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
    for (const [name, addr] of Object.entries(addresses)) {
      const code = await provider.getCode(addr);
      const hasCode = code.length > 2;
      console.log(hasCode ? "OK" : "KO", name + ":", addr, hasCode ? "" : "(PAS DE CODE)");
    }
    console.log("");
  } catch (e) {
    console.log("=> ERREUR chargement adresses:", e.message, "\n");
    return;
  }

  // 4. Contract interactions
  console.log("--- 4. LECTURE CONTRATS ON-CHAIN ---");
  const artifactsDir = path.join(__dirname, "..", "blockchain", "artifacts", "contracts");

  function loadABI(name) {
    const p = path.join(artifactsDir, name + ".sol", name + ".json");
    return JSON.parse(fs.readFileSync(p, "utf-8")).abi;
  }

  try {
    const compliance = new ethers.Contract(addresses.ComplianceRegistry, loadABI("ComplianceRegistry"), provider);
    const ownerAddr = await compliance.owner();
    console.log("ComplianceRegistry owner:", ownerAddr);

    const token = new ethers.Contract(addresses.PropertyToken_PAR7E, loadABI("PropertyToken"), provider);
    const tokenName = await token.name();
    const tokenSymbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(ownerAddr);
    console.log("PropertyToken:", tokenName, "(" + tokenSymbol + ")");
    console.log("  Total supply:", totalSupply.toString(), "| Owner balance:", ownerBalance.toString());

    const pool = new ethers.Contract(addresses.TokenSwapPool, loadABI("TokenSwapPool"), provider);
    const reserveETH = await pool.reserveETH();
    const reserveToken = await pool.reserveToken();
    const totalLiq = await pool.totalLiquidity();
    console.log("TokenSwapPool:");
    console.log("  Reserve ETH:", ethers.formatEther(reserveETH), "| Reserve Token:", reserveToken.toString());
    console.log("  Liquidite totale:", ethers.formatEther(totalLiq));

    const oracle = new ethers.Contract(addresses.PriceOracle, loadABI("PriceOracle"), provider);
    const [price, updatedAt, confidence] = await oracle.getPrice(addresses.PropertyToken_PAR7E);
    console.log("PriceOracle:");
    console.log("  Prix PAR7E:", ethers.formatEther(price), "ETH");
    console.log("  Confiance:", (Number(confidence) / 100).toFixed(1) + "%");
    console.log("  Derniere MAJ:", new Date(Number(updatedAt) * 1000).toLocaleString("fr-FR"));

    const nft = new ethers.Contract(addresses.PropertyNFT, loadABI("PropertyNFT"), provider);
    const nftName = await nft.name();
    const totalMinted = await nft.totalMinted();
    console.log("PropertyNFT:", nftName, "| Minted:", totalMinted.toString());

    const marketplace = new ethers.Contract(addresses.PropertyMarketplace, loadABI("PropertyMarketplace"), provider);
    const nextListingId = await marketplace.nextListingId();
    const feeBps = await marketplace.feeBps();
    console.log("Marketplace: Listings:", nextListingId.toString(), "| Fee:", (Number(feeBps) / 100) + "%");

    console.log("=> CONTRATS OK\n");
  } catch (e) {
    console.log("=> ERREUR lecture contrats:", e.message, "\n");
  }

  // 5. Frontend env
  console.log("--- 5. CONFIG FRONTEND ---");
  const envPath = path.join(__dirname, "..", "frontend", ".env.local");
  try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const mapping = {
      NEXT_PUBLIC_COMPLIANCE_REGISTRY: "ComplianceRegistry",
      NEXT_PUBLIC_PROPERTY_TOKEN: "PropertyToken_PAR7E",
      NEXT_PUBLIC_PROPERTY_NFT: "PropertyNFT",
      NEXT_PUBLIC_PROPERTY_MARKETPLACE: "PropertyMarketplace",
      NEXT_PUBLIC_TOKEN_SWAP_POOL: "TokenSwapPool",
      NEXT_PUBLIC_PRICE_ORACLE: "PriceOracle",
    };
    for (const line of envContent.split("\n")) {
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) continue;
      const key = line.slice(0, eqIndex).trim();
      const val = line.slice(eqIndex + 1).trim();
      if (mapping[key]) {
        const expected = addresses[mapping[key]];
        const match = val.toLowerCase() === expected.toLowerCase();
        console.log(
          match ? "OK" : "KO",
          key.replace("NEXT_PUBLIC_", ""),
          match ? "" : "\n   attendu: " + expected + "\n   trouve:  " + val
        );
      }
    }
    console.log("");
  } catch (e) {
    console.log("=> ERREUR lecture .env.local:", e.message, "\n");
  }

  // 6. Backend database
  console.log("--- 6. BASE DE DONNEES BACKEND ---");
  try {
    const Database = require("better-sqlite3");
    const db = new Database(path.join(__dirname, "tokenimmo.db"));
    const txCount = db.prepare("SELECT COUNT(*) as c FROM transactions").get();
    const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get();
    const propCount = db.prepare("SELECT COUNT(*) as c FROM properties").get();
    const oracleCount = db.prepare("SELECT COUNT(*) as c FROM oracle_prices").get();
    const indexerState = db.prepare("SELECT value FROM indexer_state WHERE key = ?").get("last_block");
    console.log("Properties:", propCount.c);
    console.log("Users (KYC):", userCount.c);
    console.log("Transactions:", txCount.c);
    console.log("Oracle prices:", oracleCount.c);
    console.log("Indexer last block:", indexerState ? indexerState.value : "N/A");
    console.log("");
  } catch (e) {
    console.log("=> ERREUR DB:", e.message, "\n");
  }

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║              DIAGNOSTIC TERMINE                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");
}

diagnose().catch(console.error);
