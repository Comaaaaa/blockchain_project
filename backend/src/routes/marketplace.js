const express = require("express");
const { getDb } = require("../db/database");
const { getContract, getAddresses } = require("../services/blockchain");

const router = express.Router();

// GET /api/marketplace/listings — All active listings
router.get("/listings", (req, res) => {
  const db = getDb();
  const listings = db
    .prepare(
      `SELECT ml.*, p.title as property_title, p.city, p.type as property_type
       FROM marketplace_listings ml
       LEFT JOIN properties p ON ml.property_id = p.id
       WHERE ml.active = 1
       ORDER BY ml.created_at DESC`
    )
    .all();
  res.json(listings);
});

// GET /api/marketplace/listings/all — All listings (including sold/cancelled)
router.get("/listings/all", (req, res) => {
  const db = getDb();
  const listings = db
    .prepare(
      `SELECT ml.*, p.title as property_title, p.city
       FROM marketplace_listings ml
       LEFT JOIN properties p ON ml.property_id = p.id
       ORDER BY ml.created_at DESC`
    )
    .all();
  res.json(listings);
});

// GET /api/marketplace/listings/:id — Single listing
router.get("/listings/:id", async (req, res) => {
  try {
    const marketplace = await getContract("PropertyMarketplace");
    const listing = await marketplace.getListing(parseInt(req.params.id));

    res.json({
      id: parseInt(req.params.id),
      seller: listing.seller,
      tokenAddress: listing.tokenAddress,
      amount: listing.amount.toString(),
      pricePerToken: listing.pricePerToken.toString(),
      active: listing.active,
      createdAt: Number(listing.createdAt),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/marketplace/pool — Get swap pool info
router.get("/pool", async (req, res) => {
  try {
    const { ethers } = require("ethers");
    const swapPool = await getContract("TokenSwapPool");

    const [reserveToken, reserveETH, totalLiquidity] = await Promise.all([
      swapPool.reserveToken(),
      swapPool.reserveETH(),
      swapPool.totalLiquidity(),
    ]);

    let spotPrice = "0";
    try {
      spotPrice = (await swapPool.getSpotPrice()).toString();
    } catch {
      // Pool may be empty
    }

    res.json({
      reserveToken: reserveToken.toString(),
      reserveETH: reserveETH.toString(),
      reserveETHFormatted: ethers.formatEther(reserveETH),
      totalLiquidity: totalLiquidity.toString(),
      spotPrice,
      spotPriceETH: ethers.formatEther(spotPrice),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/marketplace/pool/quote — Get swap quote
router.get("/pool/quote", async (req, res) => {
  const { direction, amount } = req.query;
  if (!direction || !amount) {
    return res.status(400).json({ error: "direction and amount required" });
  }

  try {
    const { ethers } = require("ethers");
    const swapPool = await getContract("TokenSwapPool");

    if (direction === "eth_to_token") {
      const ethIn = ethers.parseEther(amount);
      const tokenOut = await swapPool.getTokenOutForETH(ethIn);
      res.json({ tokenOut: tokenOut.toString(), ethIn: ethIn.toString() });
    } else if (direction === "token_to_eth") {
      const tokenIn = parseInt(amount);
      const ethOut = await swapPool.getETHOutForToken(tokenIn);
      res.json({
        ethOut: ethOut.toString(),
        ethOutFormatted: ethers.formatEther(ethOut),
        tokenIn,
      });
    } else {
      res.status(400).json({ error: "direction must be eth_to_token or token_to_eth" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
