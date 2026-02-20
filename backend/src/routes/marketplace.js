const express = require("express");
const { getDb } = require("../db/database");
const { ethers } = require("ethers");
const { getContract, getAddresses, getProvider } = require("../services/blockchain");

const router = express.Router();
const SWAP_TOKEN_DECIMALS = Number(process.env.SWAP_TOKEN_DECIMALS || "0");

const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function getTokenMetadata(tokenAddress) {
  const provider = getProvider();
  const token = new ethers.Contract(tokenAddress, ERC20_METADATA_ABI, provider);
  let erc20Decimals = 18;
  let symbol = "TOKEN";
  try {
    erc20Decimals = Number(await token.decimals());
  } catch {
    // default decimals
  }
  try {
    symbol = await token.symbol();
  } catch {
    // default symbol
  }
  return {
    symbol,
    erc20Decimals,
    swapDecimals: Number.isFinite(SWAP_TOKEN_DECIMALS) ? SWAP_TOKEN_DECIMALS : 0,
  };
}

async function reconcileMarketplaceListings(db) {
  try {
    const marketplace = await getContract("PropertyMarketplace");
    const nextListingId = Number(await marketplace.nextListingId());

    if (!Number.isFinite(nextListingId) || nextListingId <= 0) return;

    const propertyByTokenStmt = db.prepare(
      `SELECT id FROM properties WHERE LOWER(token_address) = ?`
    );
    const existingStatusStmt = db.prepare(
      `SELECT listing_status FROM marketplace_listings WHERE listing_id_onchain = ?`
    );
    const upsertStmt = db.prepare(
      `INSERT INTO marketplace_listings
        (listing_id_onchain, seller_address, token_address, property_id, amount, price_per_token_wei, listing_status, active, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(listing_id_onchain) DO UPDATE SET
         seller_address = excluded.seller_address,
         token_address = excluded.token_address,
         property_id = excluded.property_id,
         amount = excluded.amount,
         price_per_token_wei = excluded.price_per_token_wei,
         listing_status = excluded.listing_status,
         active = excluded.active`
    );

    for (let i = 0; i < nextListingId; i++) {
      const listing = await marketplace.getListing(BigInt(i));
      const tokenAddress = String(listing.tokenAddress || "").toLowerCase();
      const seller = String(listing.seller || "").toLowerCase();

      if (!tokenAddress || tokenAddress === ethers.ZeroAddress || !seller || seller === ethers.ZeroAddress) {
        continue;
      }

      const property = propertyByTokenStmt.get(tokenAddress);
      const existing = existingStatusStmt.get(i);
      const isActive = Boolean(listing.active);

      let listingStatus = "active";
      if (!isActive) {
        listingStatus = existing?.listing_status === "cancelled" ? "cancelled" : "sold";
      }

      upsertStmt.run(
        i,
        seller,
        tokenAddress,
        property ? property.id : null,
        Number(listing.amount),
        listing.pricePerToken.toString(),
        listingStatus,
        isActive ? 1 : 0
      );
    }
  } catch (error) {
    console.error("[Marketplace] Reconcile failed:", error.message);
  }
}

// GET /api/marketplace/listings — All active listings (enriched with property data)
router.get("/listings", async (req, res) => {
  const db = getDb();
  await reconcileMarketplaceListings(db);
  const listings = db
    .prepare(
      `SELECT ml.*,
              p.id as prop_id, p.title as property_title, p.city, p.type as property_type,
              p.images as property_images, p.token_symbol, p.token_price_wei,
              p.total_tokens, p.tokens_sold, p.price as property_price,
              p.net_yield, p.surface
       FROM marketplace_listings ml
       LEFT JOIN properties p ON ml.property_id = p.id
       WHERE ml.active = 1
       ORDER BY ml.created_at DESC`
    )
    .all();
  res.json(listings);
});

// GET /api/marketplace/listings/all — All listings (including sold/cancelled)
router.get("/listings/all", async (req, res) => {
  const db = getDb();
  await reconcileMarketplaceListings(db);
  const listings = db
    .prepare(
      `SELECT ml.*,
              p.id as prop_id, p.title as property_title, p.city, p.type as property_type,
              p.images as property_images, p.token_symbol, p.token_price_wei,
              p.total_tokens, p.tokens_sold, p.price as property_price,
              p.net_yield, p.surface
       FROM marketplace_listings ml
       LEFT JOIN properties p ON ml.property_id = p.id
       ORDER BY ml.created_at DESC`
    )
    .all();
  res.json(listings);
});

// GET /api/marketplace/listings/seller/:address — Listings by seller
router.get("/listings/seller/:address", async (req, res) => {
  const db = getDb();
  await reconcileMarketplaceListings(db);
  const listings = db
    .prepare(
      `SELECT ml.*,
              p.id as prop_id, p.title as property_title, p.city, p.type as property_type,
              p.images as property_images, p.token_symbol, p.token_price_wei,
              p.total_tokens, p.tokens_sold, p.price as property_price,
              p.net_yield, p.surface
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
    const swapPool = await getContract("TokenSwapPool");
    const tokenAddress = await swapPool.token();
    const tokenMeta = await getTokenMetadata(tokenAddress);

    const [reserveToken, reserveETH, totalLiquidity] = await Promise.all([
      swapPool.reserveToken(),
      swapPool.reserveETH(),
      swapPool.totalLiquidity(),
    ]);

    let spotPriceWei = "0";
    try {
      spotPriceWei = (await swapPool.getSpotPrice()).toString();
    } catch {
      // Pool may be empty
    }

    const reserveTokenFormatted = ethers.formatUnits(reserveToken, tokenMeta.swapDecimals);
    let spotPriceETH = "0";
    if (reserveToken > 0n) {
      const reserveEthNum = Number(ethers.formatEther(reserveETH));
      const reserveTokenNum = Number(reserveTokenFormatted);
      if (Number.isFinite(reserveEthNum) && Number.isFinite(reserveTokenNum) && reserveTokenNum > 0) {
        spotPriceETH = (reserveEthNum / reserveTokenNum).toFixed(12).replace(/\.?0+$/, "");
      }
    }

    res.json({
      tokenAddress,
      tokenSymbol: tokenMeta.symbol,
      tokenDecimals: tokenMeta.swapDecimals,
      tokenDecimalsERC20: tokenMeta.erc20Decimals,
      reserveToken: reserveToken.toString(),
      reserveTokenFormatted,
      reserveETH: reserveETH.toString(),
      reserveETHFormatted: ethers.formatEther(reserveETH),
      totalLiquidity: totalLiquidity.toString(),
      spotPriceWei,
      spotPriceETH,
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
    const swapPool = await getContract("TokenSwapPool");
    const tokenAddress = await swapPool.token();
    const tokenMeta = await getTokenMetadata(tokenAddress);

    if (direction === "eth_to_token") {
      const ethIn = ethers.parseEther(amount);
      const tokenOut = await swapPool.getTokenOutForETH(ethIn);
      res.json({
        tokenAddress,
        tokenSymbol: tokenMeta.symbol,
        tokenDecimals: tokenMeta.swapDecimals,
        tokenDecimalsERC20: tokenMeta.erc20Decimals,
        tokenOut: tokenOut.toString(),
        tokenOutFormatted: ethers.formatUnits(tokenOut, tokenMeta.swapDecimals),
        ethIn: ethIn.toString(),
      });
    } else if (direction === "token_to_eth") {
      const tokenIn = ethers.parseUnits(String(amount), tokenMeta.swapDecimals);
      const ethOut = await swapPool.getETHOutForToken(tokenIn);
      res.json({
        tokenAddress,
        tokenSymbol: tokenMeta.symbol,
        tokenDecimals: tokenMeta.swapDecimals,
        tokenDecimalsERC20: tokenMeta.erc20Decimals,
        ethOut: ethOut.toString(),
        ethOutFormatted: ethers.formatEther(ethOut),
        tokenIn: tokenIn.toString(),
        tokenInFormatted: String(amount),
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
    let tokenMeta = { decimals: 18, symbol: "TOKEN" };
    if (tokenAddress) {
      tokenMeta = await getTokenMetadata(tokenAddress);
    }

    if (!cfg.router || !cfg.factory || !cfg.weth || !tokenAddress) {
      return res.json({
        dex: cfg.dex,
        configured: false,
        tokenAddress,
        tokenSymbol: tokenMeta.symbol,
        tokenDecimals: tokenMeta.swapDecimals,
        tokenDecimalsERC20: tokenMeta.erc20Decimals,
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

    const reserve0 = reserves[0];
    const reserve1 = reserves[1];
    const token0IsWeth = token0.toLowerCase() === cfg.weth.toLowerCase();
    const reserveEth = token0IsWeth ? reserve0 : reserve1;
    const reserveToken = token0IsWeth ? reserve1 : reserve0;

    res.json({
      dex: cfg.dex,
      configured: true,
      pairExists: true,
      tokenAddress,
      tokenSymbol: tokenMeta.symbol,
      tokenDecimals: tokenMeta.swapDecimals,
      tokenDecimalsERC20: tokenMeta.erc20Decimals,
      pairAddress,
      token0,
      token1,
      reserve0: reserve0.toString(),
      reserve1: reserve1.toString(),
      reserveETH: reserveEth.toString(),
      reserveETHFormatted: ethers.formatEther(reserveEth),
      reserveToken: reserveToken.toString(),
      reserveTokenFormatted: ethers.formatUnits(reserveToken, tokenMeta.swapDecimals),
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

    const tokenMeta = await getTokenMetadata(tokenAddress);

    const provider = getProvider();
    const router = new ethers.Contract(cfg.router, V2_ROUTER_ABI, provider);

    if (direction === "eth_to_token") {
      const ethIn = ethers.parseEther(amount);
      const path = [cfg.weth, tokenAddress];
      const amounts = await router.getAmountsOut(ethIn, path);
      return res.json({
        dex: cfg.dex,
        tokenAddress,
        tokenSymbol: tokenMeta.symbol,
        tokenDecimals: tokenMeta.swapDecimals,
        tokenDecimalsERC20: tokenMeta.erc20Decimals,
        tokenOut: amounts[1].toString(),
        tokenOutFormatted: ethers.formatUnits(amounts[1], tokenMeta.swapDecimals),
        ethIn: ethIn.toString(),
        path,
      });
    }

    if (direction === "token_to_eth") {
      const tokenIn = ethers.parseUnits(String(amount), tokenMeta.swapDecimals);
      const path = [tokenAddress, cfg.weth];
      const amounts = await router.getAmountsOut(tokenIn, path);
      return res.json({
        dex: cfg.dex,
        tokenAddress,
        tokenSymbol: tokenMeta.symbol,
        tokenDecimals: tokenMeta.swapDecimals,
        tokenDecimalsERC20: tokenMeta.erc20Decimals,
        ethOut: amounts[1].toString(),
        ethOutFormatted: ethers.formatEther(amounts[1]),
        tokenIn: tokenIn.toString(),
        tokenInFormatted: String(amount),
        path,
      });
    }

    res.status(400).json({ error: "direction must be eth_to_token or token_to_eth" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
