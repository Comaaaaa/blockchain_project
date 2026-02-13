const hre = require("hardhat");
const { properties } = require("../properties-config");

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

  // 3. Deploy PropertyNFT
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

  // 4. Deploy PropertyToken contracts dynamically
  const deployedPropertyTokens = [];
  const PropertyTokenFactory = await hre.ethers.getContractFactory("PropertyToken");

  for (const property of properties) {
    if (property.token_symbol) {
      console.log(`\n--- Deploying PropertyToken (${property.token_symbol}) ---`);
      const tokenPrice = hre.ethers.parseUnits(property.token_price_wei, "wei"); // Use parseUnits for wei
      const propertyToken = await PropertyTokenFactory.deploy(
        property.token_name,
        property.token_symbol,
        property.id,
        property.total_tokens,
        tokenPrice,
        complianceAddr
      );
      await propertyToken.waitForDeployment();
      const propertyTokenAddr = await propertyToken.getAddress();
      console.log(`PropertyToken (${property.token_symbol}) deployed at:`, propertyTokenAddr);

      // Set initial price in oracle
      // Assuming a fixed confidence for now, e.g., 9500 (95.00%)
      await oracle.updatePrice(propertyTokenAddr, tokenPrice, 9500);
      console.log(`Oracle price set for ${property.token_symbol}`);

      deployedPropertyTokens.push({
        id: property.id,
        symbol: property.token_symbol,
        address: propertyTokenAddr,
        instance: propertyToken,
      });
    }
  }

  // Ensure at least one property token is deployed for the swap pool
  if (deployedPropertyTokens.length === 0) {
    throw new Error("No tokenizable properties found to deploy PropertyToken contracts.");
  }

  const firstPropertyTokenAddr = deployedPropertyTokens[0].address;
  const firstPropertyTokenInstance = deployedPropertyTokens[0].instance;

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
  const swapPool = await TokenSwapPool.deploy(firstPropertyTokenAddr, complianceAddr);
  await swapPool.waitForDeployment();
  const swapPoolAddr = await swapPool.getAddress();
  console.log("TokenSwapPool deployed at:", swapPoolAddr);

  // 7. Whitelist contracts so they can hold tokens
  console.log("\n--- Whitelisting contracts ---");
  await compliance.addToWhitelist(swapPoolAddr);
  console.log("SwapPool whitelisted");
  await compliance.addToWhitelist(marketplaceAddr);
  console.log("Marketplace whitelisted");

  // 8. Provide initial liquidity to the pool (using the first deployed property token)
  console.log("\n--- Adding initial liquidity ---");
  const liquidityTokens = 200; // 200 tokens
  const liquidityETH = hre.ethers.parseEther("0.2"); // 0.2 ETH

  // Approve swapPool to spend deployer's tokens
  await firstPropertyTokenInstance.approve(swapPoolAddr, liquidityTokens);
  await swapPool.addLiquidity(liquidityTokens, { value: liquidityETH });
  console.log(`Added liquidity: ${liquidityTokens} ${deployedPropertyTokens[0].symbol} + 0.2 ETH`);

  // Summary
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  const addresses = {
    ComplianceRegistry: complianceAddr,
    PriceOracle: oracleAddr,
    PropertyNFT: propertyNFTAddr,
    PropertyMarketplace: marketplaceAddr,
    TokenSwapPool: swapPoolAddr,
  };

  // Add dynamically deployed property token addresses to the summary
  deployedPropertyTokens.forEach((token) => {
    addresses[`PropertyToken_${token.symbol}`] = token.address;
  });

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

