const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy ComplianceRegistry
  console.log("\n--- Deploying ComplianceRegistry ---");
  const ComplianceRegistry = await hre.ethers.getContractFactory("ComplianceRegistry");
  const compliance = await ComplianceRegistry.deploy();
  await compliance.waitForDeployment();
  const complianceAddr = await compliance.getAddress();
  console.log("ComplianceRegistry deployed at:", complianceAddr);

  // Whitelist the deployer
  await compliance.addToWhitelist(deployer.address);
  console.log("Deployer whitelisted:", deployer.address);

  // 2. Deploy PriceOracle
  console.log("\n--- Deploying PriceOracle ---");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("PriceOracle deployed at:", oracleAddr);

  // 3. Deploy PropertyToken (ERC-20 for a sample property)
  console.log("\n--- Deploying PropertyToken (PAR7E) ---");
  const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
  const tokenPrice = hre.ethers.parseEther("0.001"); // 0.001 ETH per token
  const propertyToken = await PropertyToken.deploy(
    "Appartement Paris 7e",
    "PAR7E",
    "prop-001",
    1000, // 1000 tokens
    tokenPrice,
    complianceAddr
  );
  await propertyToken.waitForDeployment();
  const propertyTokenAddr = await propertyToken.getAddress();
  console.log("PropertyToken (PAR7E) deployed at:", propertyTokenAddr);

  // Set initial price in oracle
  await oracle.updatePrice(propertyTokenAddr, tokenPrice, 9500);
  console.log("Oracle price set for PAR7E");

  // 4. Deploy PropertyNFT
  console.log("\n--- Deploying PropertyNFT ---");
  const PropertyNFT = await hre.ethers.getContractFactory("PropertyNFT");
  const propertyNFT = await PropertyNFT.deploy(
    "TokenImmo Assets",
    "TIMMO",
    complianceAddr
  );
  await propertyNFT.waitForDeployment();
  const propertyNFTAddr = await propertyNFT.getAddress();
  console.log("PropertyNFT deployed at:", propertyNFTAddr);

  // 5. Deploy PropertyMarketplace
  console.log("\n--- Deploying PropertyMarketplace ---");
  const PropertyMarketplace = await hre.ethers.getContractFactory("PropertyMarketplace");
  const marketplace = await PropertyMarketplace.deploy(complianceAddr);
  await marketplace.waitForDeployment();
  const marketplaceAddr = await marketplace.getAddress();
  console.log("PropertyMarketplace deployed at:", marketplaceAddr);

  // 6. Deploy TokenSwapPool (AMM liquidity pool)
  console.log("\n--- Deploying TokenSwapPool ---");
  const TokenSwapPool = await hre.ethers.getContractFactory("TokenSwapPool");
  const swapPool = await TokenSwapPool.deploy(propertyTokenAddr, complianceAddr);
  await swapPool.waitForDeployment();
  const swapPoolAddr = await swapPool.getAddress();
  console.log("TokenSwapPool deployed at:", swapPoolAddr);

  // 7. Whitelist contracts so they can hold tokens
  console.log("\n--- Whitelisting contracts ---");
  await compliance.addToWhitelist(swapPoolAddr);
  console.log("SwapPool whitelisted");
  await compliance.addToWhitelist(marketplaceAddr);
  console.log("Marketplace whitelisted");

  // 8. Provide initial liquidity to the pool
  console.log("\n--- Adding initial liquidity ---");
  const liquidityTokens = 200; // 200 tokens
  const liquidityETH = hre.ethers.parseEther("0.2"); // 0.2 ETH

  await propertyToken.approve(swapPoolAddr, liquidityTokens);
  await swapPool.addLiquidity(liquidityTokens, { value: liquidityETH });
  console.log("Added liquidity: 200 PAR7E + 0.2 ETH");

  // Summary
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  const addresses = {
    ComplianceRegistry: complianceAddr,
    PriceOracle: oracleAddr,
    PropertyToken_PAR7E: propertyTokenAddr,
    PropertyNFT: propertyNFTAddr,
    PropertyMarketplace: marketplaceAddr,
    TokenSwapPool: swapPoolAddr,
  };

  console.log(JSON.stringify(addresses, null, 2));

  // Write addresses to file for backend/frontend
  const fs = require("fs");
  const path = require("path");
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to:", addressesPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
