const hre = require("hardhat");
const { properties, ETH_EUR_RATE } = require("../properties-config");

async function main() {
  const envNftListPriceEth = process.env.NFT_LISTING_PRICE_ETH;
  const envLiquidityTokens = process.env.INITIAL_LIQUIDITY_TOKENS;
  const envLiquidityEth = process.env.INITIAL_LIQUIDITY_ETH;
  const envDemoListingTokens = process.env.DEMO_LISTING_TOKENS;

  const liquidityTokens = Number(envLiquidityTokens || "200");
  if (!Number.isFinite(liquidityTokens) || liquidityTokens <= 0) {
    throw new Error("INITIAL_LIQUIDITY_TOKENS must be a positive number");
  }

  const demoListingTokens = Number(envDemoListingTokens || "50");
  if (!Number.isFinite(demoListingTokens) || demoListingTokens <= 0) {
    throw new Error("DEMO_LISTING_TOKENS must be a positive number");
  }

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

  // Whitelist the deployer + all default Hardhat test accounts
  const signers = await hre.ethers.getSigners();
  const accountsToWhitelist = signers.slice(0, 10).map(s => s.address);
  const txBatchWL = await compliance.batchWhitelist(accountsToWhitelist);
  await txBatchWL.wait();
  console.log(`Whitelisted ${accountsToWhitelist.length} accounts (deployer + test accounts)`);

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

  // Mint NFTs for the first 3 properties
  const nftProperties = properties.slice(0, 3);
  for (let i = 0; i < nftProperties.length; i++) {
    const prop = nftProperties[i];
    const valuationETH = (prop.price / ETH_EUR_RATE).toFixed(18);
    const valuation = hre.ethers.parseEther(valuationETH);
    const txMintNFT = await propertyNFT.mintAsset(
      deployer.address,
      `ipfs://QmTokenImmo/${prop.id}`,
      "property_deed",
      `${prop.address}, ${prop.zip_code} ${prop.city}`,
      valuation,
      prop.id
    );
    await txMintNFT.wait();
    console.log(`NFT #${i} minted for ${prop.id} (${prop.title})`);
  }

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

  // 6. Deploy NFTMarketplace
  console.log("\n--- Deploying NFTMarketplace ---");
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const nftMarketplace = await NFTMarketplace.deploy(complianceAddr);
  await nftMarketplace.waitForDeployment();
  const nftMarketplaceAddr = await nftMarketplace.getAddress();
  console.log("NFTMarketplace deployed at:", nftMarketplaceAddr);

  // 7. Deploy TokenSwapPool (AMM liquidity pool)
  console.log("\n--- Deploying TokenSwapPool ---");
  const TokenSwapPool = await hre.ethers.getContractFactory("TokenSwapPool");
  const swapPool = await TokenSwapPool.deploy(firstPropertyTokenAddr, complianceAddr);
  await swapPool.waitForDeployment();
  const swapPoolAddr = await swapPool.getAddress();
  console.log("TokenSwapPool deployed at:", swapPoolAddr);

  // 8. Whitelist contracts so they can hold tokens
  console.log("\n--- Whitelisting contracts ---");
  const txWL1 = await compliance.addToWhitelist(swapPoolAddr);
  await txWL1.wait();
  console.log("SwapPool whitelisted");
  const txWL2 = await compliance.addToWhitelist(marketplaceAddr);
  await txWL2.wait();
  console.log("Marketplace whitelisted");
  const txWL3 = await compliance.addToWhitelist(nftMarketplaceAddr);
  await txWL3.wait();
  console.log("NFTMarketplace whitelisted");

  // 9. Create demo NFT listings on the NFTMarketplace
  console.log("\n--- Creating demo NFT listings ---");
  // List NFT #0 and #1 for sale on the NFTMarketplace
  for (let tokenId = 0; tokenId < 2; tokenId++) {
    const prop = nftProperties[tokenId];
    const listPriceETH = envNftListPriceEth || (prop.price / ETH_EUR_RATE).toFixed(18);
    const listPrice = hre.ethers.parseEther(listPriceETH);
    // Approve the NFTMarketplace to transfer this NFT
    const txApprove = await propertyNFT.approve(nftMarketplaceAddr, tokenId);
    await txApprove.wait();
    // Create listing
    const txList = await nftMarketplace.createListing(propertyNFTAddr, tokenId, listPrice);
    await txList.wait();
    console.log(`NFT #${tokenId} listed for sale at ${listPriceETH} ETH (${prop.title})`);
  }

  // 10. Provide initial liquidity to the pool
  console.log("\n--- Adding initial liquidity ---");
  // Liquidite ETH proportionnelle au prix des tokens
  const firstTokenPriceWei = BigInt(deployedPropertyTokens[0].instance ? properties.find(p => p.token_symbol === deployedPropertyTokens[0].symbol).token_price_wei : "0");
  const liquidityETHWei = envLiquidityEth
    ? hre.ethers.parseEther(envLiquidityEth)
    : firstTokenPriceWei * BigInt(liquidityTokens);
  const liquidityETHFormatted = hre.ethers.formatEther(liquidityETHWei);

  // Approve swapPool to spend deployer's tokens
  await firstPropertyTokenInstance.approve(swapPoolAddr, BigInt(liquidityTokens));
  await swapPool.addLiquidity(BigInt(liquidityTokens), { value: liquidityETHWei });
  console.log(`Added liquidity: ${liquidityTokens} ${deployedPropertyTokens[0].symbol} + ${liquidityETHFormatted} ETH`);

  // 11. Create a demo token marketplace listing
  console.log("\n--- Creating demo token listing ---");
  const demoTokenPrice = BigInt(properties[0].token_price_wei);
  // Approve the marketplace to transfer tokens from deployer
  await firstPropertyTokenInstance.approve(marketplaceAddr, BigInt(demoListingTokens));
  const txCreateListing = await marketplace.createListing(
    firstPropertyTokenAddr,
    BigInt(demoListingTokens),
    demoTokenPrice
  );
  await txCreateListing.wait();
  console.log(`Listed ${demoListingTokens} ${deployedPropertyTokens[0].symbol} tokens at ${hre.ethers.formatEther(demoTokenPrice)} ETH/token`);

  // Summary
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  const addresses = {
    ComplianceRegistry: complianceAddr,
    PriceOracle: oracleAddr,
    PropertyNFT: propertyNFTAddr,
    PropertyMarketplace: marketplaceAddr,
    NFTMarketplace: nftMarketplaceAddr,
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

