const express = require("express");
const { getDb } = require("../db/database");
const { ethers } = require("ethers");
const { getContract, getAddresses, getProvider } = require("../services/blockchain");

const router = express.Router();

// GET /api/marketplace/listings — All active listings (enriched with property data)
router.get("/listings", (req, res) => {
  const db = getDb();
  const listings = db
    .prepare(
      `SELECT ml.*,
              p.id as prop_id, p.title as property_title, p.city, p.type as property_type,
              p.images as property_images, p.token_symbol, p.token_price_wei,
              p.total_tokens, p.tokens_sold, p.price as property_price,
              p.net_yield, p.surface,
              ml.listing_status
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
      `SELECT ml.*,
              p.id as prop_id, p.title as property_title, p.city, p.type as property_type,
              p.images as property_images, p.token_symbol, p.token_price_wei,
              p.total_tokens, p.tokens_sold, p.price as property_price,
              p.net_yield, p.surface,
              ml.listing_status
       FROM marketplace_listings ml
       LEFT JOIN properties p ON ml.property_id = p.id
       ORDER BY ml.created_at DESC`
    )
    .all();
  res.json(listings);
});

// GET /api/marketplace/listings/seller/:address — Listings by seller
router.get("/listings/seller/:address", (req, res) => {
  const db = getDb();
  const listings = db
    .prepare(
      `SELECT ml.*,
              p.id as prop_id, p.title as property_title, p.city, p.type as property_type,
              p.images as property_images, p.token_symbol, p.token_price_wei,
              p.total_tokens, p.tokens_sold, p.price as property_price,
              p.net_yield, p.surface,
              ml.listing_status
       FROM marketplace_listings ml
       LEFT JOIN properties p ON ml.property_id = p.id
       WHERE LOWER(ml.seller_address) = ?
       ORDER BY ml.created_at DESC`
    )
    .all(req.params.address.toLowerCase());
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

function getDexConfig(dex) {
  const key = (dex || "uniswap").toLowerCase();
  if (key === "sushiswap") {
    return {
      dex: "sushiswap",
      router: process.env.SUSHISWAP_V2_ROUTER_ADDRESS,
      factory: process.env.SUSHISWAP_V2_FACTORY_ADDRESS,
      weth: process.env.WETH_ADDRESS,
    };
  }
  return {
    dex: "uniswap",
    router: process.env.UNISWAP_V2_ROUTER_ADDRESS,
    factory: process.env.UNISWAP_V2_FACTORY_ADDRESS,
    weth: process.env.WETH_ADDRESS,
  };
}

const V2_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];

const V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];

const V2_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

// GET /api/marketplace/dex/pair?dex=uniswap|sushiswap — configured DEX pair info
router.get("/dex/pair", async (req, res) => {
  try {
    const cfg = getDexConfig(req.query.dex);
    const addresses = getAddresses();
    const tokenAddress = addresses.PropertyToken_PAR7E;

    if (!cfg.router || !cfg.factory || !cfg.weth || !tokenAddress) {
      return res.json({
        dex: cfg.dex,
        configured: false,
        reason: "Missing DEX env vars or token address",
      });
    }

    const provider = getProvider();
    const factory = new ethers.Contract(cfg.factory, V2_FACTORY_ABI, provider);
    const pairAddress = await factory.getPair(tokenAddress, cfg.weth);

    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
      return res.json({ dex: cfg.dex, configured: true, pairExists: false, pairAddress: null });
    }

    const pair = new ethers.Contract(pairAddress, V2_PAIR_ABI, provider);
    const [reserves, token0, token1] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      pair.token1(),
    ]);

    res.json({
      dex: cfg.dex,
      configured: true,
      pairExists: true,
      pairAddress,
      token0,
      token1,
      reserve0: reserves[0].toString(),
      reserve1: reserves[1].toString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/marketplace/dex/quote?dex=uniswap|sushiswap&direction=eth_to_token|token_to_eth&amount=...
router.get("/dex/quote", async (req, res) => {
  const { direction, amount } = req.query;
  if (!direction || !amount) {
    return res.status(400).json({ error: "direction and amount required" });
  }

  try {
    const cfg = getDexConfig(req.query.dex);
    const addresses = getAddresses();
    const tokenAddress = addresses.PropertyToken_PAR7E;

    if (!cfg.router || !cfg.weth || !tokenAddress) {
      return res.status(400).json({ error: "DEX is not configured" });
    }

    const provider = getProvider();
    const router = new ethers.Contract(cfg.router, V2_ROUTER_ABI, provider);

    if (direction === "eth_to_token") {
      const ethIn = ethers.parseEther(amount);
      const path = [cfg.weth, tokenAddress];
      const amounts = await router.getAmountsOut(ethIn, path);
      return res.json({
        dex: cfg.dex,
        tokenOut: amounts[1].toString(),
        ethIn: ethIn.toString(),
        path,
      });
    }

    if (direction === "token_to_eth") {
      const tokenIn = BigInt(amount);
      const path = [tokenAddress, cfg.weth];
      const amounts = await router.getAmountsOut(tokenIn, path);
      return res.json({
        dex: cfg.dex,
        ethOut: amounts[1].toString(),
        ethOutFormatted: ethers.formatEther(amounts[1]),
        tokenIn: tokenIn.toString(),
        path,
      });
    }

    res.status(400).json({ error: "direction must be eth_to_token or token_to_eth" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
