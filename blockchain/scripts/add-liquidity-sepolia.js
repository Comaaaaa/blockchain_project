const hre = require("hardhat");

/**
 * Script to add initial liquidity to already-deployed Sepolia contracts.
 * Run: npx hardhat run scripts/add-liquidity-sepolia.js --network sepolia
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Addresses from the failed deploy (contracts are live on Sepolia)
  const ADDRESSES = {
    ComplianceRegistry: "0xb18e1E3d9cF63967bc989e7Adc9c15979b721b30",
    PriceOracle: "0x3bB2d55A1C3CbA3dD9BA65aDe3A0E8568DA63856",
    PropertyToken_PAR7E: "0x8DbfB2D4EAc1F18C6eA05cB838C0b6113A2f6D38",
    PropertyNFT: "0x8E7cdACe9CCB15003551b67cE09b179668c28472",
    PropertyMarketplace: "0x4Ffdc072Cd4e4bDd2e70f5f7A9d5B0c79DC6a495",
    TokenSwapPool: "0x083DAc7010C53DdC71edB8F9FbAd2277fCA0C0D5",
  };

  // Get contract instances
  const compliance = await hre.ethers.getContractAt("ComplianceRegistry", ADDRESSES.ComplianceRegistry);
  const propertyToken = await hre.ethers.getContractAt("PropertyToken", ADDRESSES.PropertyToken_PAR7E);
  const swapPool = await hre.ethers.getContractAt("TokenSwapPool", ADDRESSES.TokenSwapPool);

  // Check if swap pool is already whitelisted
  const poolWhitelisted = await compliance.isCompliant(ADDRESSES.TokenSwapPool);
  console.log("SwapPool already whitelisted:", poolWhitelisted);

  if (!poolWhitelisted) {
    console.log("Whitelisting SwapPool...");
    const tx = await compliance.addToWhitelist(ADDRESSES.TokenSwapPool);
    await tx.wait();
    console.log("SwapPool whitelisted");
  }

  // Check marketplace whitelist
  const mktWhitelisted = await compliance.isCompliant(ADDRESSES.PropertyMarketplace);
  console.log("Marketplace already whitelisted:", mktWhitelisted);

  if (!mktWhitelisted) {
    console.log("Whitelisting Marketplace...");
    const tx = await compliance.addToWhitelist(ADDRESSES.PropertyMarketplace);
    await tx.wait();
    console.log("Marketplace whitelisted");
  }

  // Check current pool state
  const currentLiquidity = await swapPool.totalLiquidity();
  console.log("Current pool liquidity:", currentLiquidity.toString());

  if (currentLiquidity > 0n) {
    console.log("Pool already has liquidity, skipping.");
  } else {
    // Approve tokens
    const liquidityTokens = 200;
    const liquidityETH = hre.ethers.parseEther("0.2");

    console.log("Approving 200 tokens for swap pool...");
    const txApprove = await propertyToken.approve(ADDRESSES.TokenSwapPool, liquidityTokens);
    await txApprove.wait();
    console.log("Approved.");

    console.log("Adding liquidity: 200 PAR7E + 0.2 ETH...");
    const txLiq = await swapPool.addLiquidity(liquidityTokens, { value: liquidityETH });
    await txLiq.wait();
    console.log("Liquidity added!");
  }

  // Save addresses to deployed-addresses.json
  const fs = require("fs");
  const path = require("path");
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(ADDRESSES, null, 2));
  console.log("\nAddresses saved to:", addressesPath);

  // Print summary
  console.log("\n========================================");
  console.log("SEPOLIA DEPLOYMENT - COMPLETE");
  console.log("========================================");
  console.log(JSON.stringify(ADDRESSES, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
