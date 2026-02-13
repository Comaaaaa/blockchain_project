const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Load ABIs from compiled artifacts
const ARTIFACTS_DIR = path.join(__dirname, "..", "..", "..", "blockchain", "artifacts", "contracts");

function loadABI(contractName) {
  const artifactPath = path.join(ARTIFACTS_DIR, `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.warn(`ABI not found: ${artifactPath}`);
    return [];
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

const ABIs = {
  ComplianceRegistry: loadABI("ComplianceRegistry"),
  PropertyToken: loadABI("PropertyToken"),
  PropertyNFT: loadABI("PropertyNFT"),
  PropertyMarketplace: loadABI("PropertyMarketplace"),
  PriceOracle: loadABI("PriceOracle"),
  TokenSwapPool: loadABI("TokenSwapPool"),
};

// Load deployed addresses
function loadAddresses() {
  const addressPath = path.join(__dirname, "..", "..", "..", "blockchain", "deployed-addresses.json");
  if (!fs.existsSync(addressPath)) {
    console.warn("deployed-addresses.json not found, using env vars");
    return {
      ComplianceRegistry: process.env.COMPLIANCE_REGISTRY_ADDRESS,
      PriceOracle: process.env.PRICE_ORACLE_ADDRESS,
      PropertyToken_PAR7E: process.env.PROPERTY_TOKEN_ADDRESS,
      PropertyNFT: process.env.PROPERTY_NFT_ADDRESS,
      PropertyMarketplace: process.env.PROPERTY_MARKETPLACE_ADDRESS,
      TokenSwapPool: process.env.TOKEN_SWAP_POOL_ADDRESS,
    };
  }
  return JSON.parse(fs.readFileSync(addressPath, "utf-8"));
}

let provider;
let signer;
let contracts = {};
let addresses = {};

function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

async function getSigner() {
  if (!signer) {
    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (pk) {
      signer = new ethers.Wallet(pk, getProvider());
    } else {
      // Local development: use first account
      signer = await getProvider().getSigner(0);
    }
  }
  return signer;
}

async function getContract(name) {
  if (!contracts[name]) {
    if (Object.keys(addresses).length === 0) {
      addresses = loadAddresses();
    }
    const s = await getSigner();
    const addressKey = name === "PropertyToken" ? "PropertyToken_PAR7E" : name;
    const addr = addresses[addressKey];
    if (!addr) throw new Error(`No address found for ${name}`);
    contracts[name] = new ethers.Contract(addr, ABIs[name], s);
  }
  return contracts[name];
}

function getAddresses() {
  if (Object.keys(addresses).length === 0) {
    addresses = loadAddresses();
  }
  return addresses;
}

module.exports = {
  ABIs,
  getProvider,
  getSigner,
  getContract,
  getAddresses,
  loadABI,
};
