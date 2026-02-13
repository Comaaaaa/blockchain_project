const express = require("express");
const { getDb } = require("../db/database");
const { getContract, getAddresses } = require("../services/blockchain");

const router = express.Router();

// GET /api/properties — List all properties
router.get("/", (req, res) => {
  const db = getDb();
  const { city, type, status, minPrice, maxPrice, search, sort } = req.query;

  let query = "SELECT * FROM properties WHERE 1=1";
  const params = [];

  if (city) {
    query += " AND city = ?";
    params.push(city);
  }
  if (type) {
    query += " AND type = ?";
    params.push(type);
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (minPrice) {
    query += " AND price >= ?";
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    query += " AND price <= ?";
    params.push(parseFloat(maxPrice));
  }
  if (search) {
    query += " AND (title LIKE ? OR city LIKE ? OR description LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  switch (sort) {
    case "price_asc":
      query += " ORDER BY price ASC";
      break;
    case "price_desc":
      query += " ORDER BY price DESC";
      break;
    case "yield_desc":
      query += " ORDER BY net_yield DESC";
      break;
    case "newest":
      query += " ORDER BY created_at DESC";
      break;
    default:
      query += " ORDER BY created_at DESC";
  }

  const properties = db.prepare(query).all(...params);

  // Parse JSON images
  const result = properties.map((p) => ({
    ...p,
    images: p.images ? JSON.parse(p.images) : [],
    featured: !!p.featured,
  }));

  res.json(result);
});

// GET /api/properties/featured — Featured properties
router.get("/featured", (req, res) => {
  const db = getDb();
  const properties = db.prepare("SELECT * FROM properties WHERE featured = 1 LIMIT 4").all();
  const result = properties.map((p) => ({
    ...p,
    images: p.images ? JSON.parse(p.images) : [],
    featured: true,
  }));
  res.json(result);
});

// GET /api/properties/:id — Get single property
router.get("/:id", (req, res) => {
  const db = getDb();
  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!property) return res.status(404).json({ error: "Property not found" });

  property.images = property.images ? JSON.parse(property.images) : [];
  property.featured = !!property.featured;

  // Include linked NFT if any
  const nft = db.prepare("SELECT * FROM nfts WHERE property_id = ?").get(req.params.id);
  property.nft = nft ? {
    tokenId: nft.token_id,
    ownerAddress: nft.owner_address,
    assetType: nft.asset_type,
    location: nft.location,
    valuationWei: nft.valuation_wei,
    tokenUri: nft.token_uri,
    createdAt: nft.created_at,
  } : null;

  res.json(property);
});

// POST /api/properties — Create new property
router.post("/", (req, res) => {
  const db = getDb();
  const {
    id, title, description, address, city, zip_code, type,
    price, surface, rooms, bedrooms, year_built, images,
    token_address, token_symbol, token_name, total_tokens,
    token_price_wei, annual_rent, annual_charges, net_yield,
    gross_yield, occupancy_rate, status, featured,
  } = req.body;

  try {
    db.prepare(
      `INSERT INTO properties (id, title, description, address, city, zip_code, type,
        price, surface, rooms, bedrooms, year_built, images,
        token_address, token_symbol, token_name, total_tokens,
        token_price_wei, annual_rent, annual_charges, net_yield,
        gross_yield, occupancy_rate, status, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, title, description, address, city, zip_code, type,
      price, surface, rooms, bedrooms, year_built,
      JSON.stringify(images || []),
      token_address, token_symbol, token_name, total_tokens,
      token_price_wei, annual_rent, annual_charges, net_yield,
      gross_yield, occupancy_rate || 95, status || "available",
      featured ? 1 : 0
    );
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/properties/:id/token-info — Get on-chain token info
router.get("/:id/token-info", async (req, res) => {
  const db = getDb();
  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!property || !property.token_address) {
    return res.status(404).json({ error: "Token not found for this property" });
  }

  try {
    const { ethers } = require("ethers");
    const { loadABI, getProvider, getSigner } = require("../services/blockchain");
    const abi = loadABI("PropertyToken");
    const provider = getProvider();
    const token = new ethers.Contract(property.token_address, abi, provider);

    const [totalSupply, name, symbol, tokenPrice, availableTokens] = await Promise.all([
      token.totalSupply(),
      token.name(),
      token.symbol(),
      token.tokenPrice(),
      token.availableTokens(),
    ]);

    res.json({
      address: property.token_address,
      name,
      symbol,
      totalSupply: totalSupply.toString(),
      tokenPrice: tokenPrice.toString(),
      tokenPriceETH: ethers.formatEther(tokenPrice),
      availableTokens: availableTokens.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
