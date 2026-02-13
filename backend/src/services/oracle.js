const { ethers } = require("ethers");
const { getContract, getAddresses } = require("./blockchain");
const { getDb } = require("../db/database");

/**
 * Oracle service — fetches simulated market data and pushes price updates on-chain.
 * In production, this would pull from real APIs (CoinGecko, Chainlink, etc).
 */

// Simulated base prices for properties (in ETH)
const BASE_PRICES = {
  PAR7E: 0.001, // Appartement Paris 7e
};

function simulateMarketPrice(basePrice) {
  // Random walk: ±5% variation
  const variation = (Math.random() - 0.5) * 0.1;
  return basePrice * (1 + variation);
}

async function updateOraclePrices() {
  try {
    const oracle = await getContract("PriceOracle");
    const addresses = getAddresses();

    const tokenAddress = addresses.PropertyToken_PAR7E;
    if (!tokenAddress) {
      console.log("[Oracle] No token address configured");
      return;
    }

    const newPrice = simulateMarketPrice(BASE_PRICES.PAR7E);
    const priceWei = ethers.parseEther(newPrice.toFixed(18));
    const confidence = 9000 + Math.floor(Math.random() * 1000); // 90-100%

    const tx = await oracle.updatePrice(tokenAddress, priceWei, confidence);
    await tx.wait();

    console.log(
      `[Oracle] Updated PAR7E price: ${newPrice.toFixed(6)} ETH (confidence: ${confidence / 100}%)`
    );

    // Store in local DB as well
    const db = getDb();
    db.prepare(
      `INSERT INTO oracle_prices (token_address, price_wei, confidence, source)
       VALUES (?, ?, ?, 'oracle_service')`
    ).run(tokenAddress.toLowerCase(), priceWei.toString(), confidence);
  } catch (error) {
    console.error("[Oracle] Error updating prices:", error.message);
  }
}

async function getLatestPrice(tokenAddress) {
  try {
    const oracle = await getContract("PriceOracle");
    const [price, updatedAt, confidence] = await oracle.getPrice(tokenAddress);
    return {
      price: price.toString(),
      priceETH: ethers.formatEther(price),
      updatedAt: Number(updatedAt),
      confidence: Number(confidence),
    };
  } catch (error) {
    console.error("[Oracle] Error getting price:", error.message);
    return null;
  }
}

async function getPriceHistory(tokenAddress, limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT price_wei, confidence, source, created_at
       FROM oracle_prices
       WHERE token_address = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(tokenAddress.toLowerCase(), limit);
}

module.exports = { updateOraclePrices, getLatestPrice, getPriceHistory };
