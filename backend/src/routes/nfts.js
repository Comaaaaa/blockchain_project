const express = require("express");
const { getDb } = require("../db/database");
const { getContract } = require("../services/blockchain");

const router = express.Router();

// GET /api/nfts — List all NFTs
router.get("/", (req, res) => {
  const db = getDb();
  const nfts = db.prepare(`
    SELECT n.*, p.title AS property_title, p.city AS property_city
    FROM nfts n
    LEFT JOIN properties p ON n.property_id = p.id
    ORDER BY n.created_at DESC
  `).all();
  res.json(nfts);
});

// GET /api/nfts/listings — Active NFT listings with joined NFT + property data
router.get("/listings", (req, res) => {
  const db = getDb();
  const listings = db.prepare(`
    SELECT
      nl.id,
      nl.listing_id_onchain,
      nl.seller_address,
      nl.nft_contract,
      nl.nft_token_id,
      nl.price_wei,
      nl.active,
      nl.buyer_address,
      nl.tx_hash,
      nl.created_at,
      n.asset_type,
      n.location,
      n.valuation_wei,
      p.title AS property_title
    FROM nft_listings nl
    LEFT JOIN nfts n ON nl.nft_token_id = n.token_id
    LEFT JOIN properties p ON n.property_id = p.id
    WHERE nl.active = 1
    ORDER BY nl.created_at DESC
  `).all();
  res.json(listings);
});

// GET /api/nfts/listings/all — All NFT listings (including inactive)
router.get("/listings/all", (req, res) => {
  const db = getDb();
  const listings = db.prepare(`
    SELECT
      nl.id,
      nl.listing_id_onchain,
      nl.seller_address,
      nl.nft_contract,
      nl.nft_token_id,
      nl.price_wei,
      nl.active,
      nl.buyer_address,
      nl.tx_hash,
      nl.created_at,
      n.asset_type,
      n.location,
      n.valuation_wei,
      p.title AS property_title
    FROM nft_listings nl
    LEFT JOIN nfts n ON nl.nft_token_id = n.token_id
    LEFT JOIN properties p ON n.property_id = p.id
    ORDER BY nl.created_at DESC
  `).all();
  res.json(listings);
});

// GET /api/nfts/:tokenId — Get single NFT (from DB, with on-chain fallback)
router.get("/:tokenId", async (req, res) => {
  const tokenId = parseInt(req.params.tokenId);
  const db = getDb();
  const row = db.prepare(`
    SELECT n.*, p.title AS property_title, p.city AS property_city
    FROM nfts n
    LEFT JOIN properties p ON n.property_id = p.id
    WHERE n.token_id = ?
  `).get(tokenId);

  if (row) {
    return res.json({
      tokenId: row.token_id,
      owner: row.owner_address,
      tokenURI: row.token_uri,
      assetType: row.asset_type,
      location: row.location,
      valuationWei: row.valuation_wei,
      propertyId: row.property_id,
      propertyTitle: row.property_title,
      propertyCity: row.property_city,
      createdAt: row.created_at,
    });
  }

  // Fallback: try on-chain
  try {
    const nft = await getContract("PropertyNFT");
    const [owner, uri, metadata] = await Promise.all([
      nft.ownerOf(tokenId),
      nft.tokenURI(tokenId),
      nft.nftMetadata(tokenId),
    ]);

    res.json({
      tokenId,
      owner,
      tokenURI: uri,
      assetType: metadata.assetType,
      location: metadata.location,
      valuationWei: metadata.valuationWei.toString(),
      propertyId: metadata.propertyId || null,
      mintedAt: Number(metadata.mintedAt),
    });
  } catch (error) {
    res.status(404).json({ error: "NFT not found" });
  }
});

// POST /api/nfts/mint — Mint a new NFT (admin)
router.post("/mint", async (req, res) => {
  const { to, uri, assetType, location, valuationWei, propertyId } = req.body;

  if (!to || !uri || !assetType) {
    return res.status(400).json({ error: "to, uri, assetType required" });
  }

  const db = getDb();

  // Validate propertyId if provided
  if (propertyId) {
    const property = db.prepare("SELECT id FROM properties WHERE id = ?").get(propertyId);
    if (!property) {
      return res.status(400).json({ error: "Property not found" });
    }
    const existingNft = db.prepare("SELECT token_id FROM nfts WHERE property_id = ?").get(propertyId);
    if (existingNft) {
      return res.status(409).json({ error: "This property already has an NFT" });
    }
  }

  try {
    const { ethers } = require("ethers");
    const nft = await getContract("PropertyNFT");
    const valuation = valuationWei || ethers.parseEther("1").toString();

    const tx = await nft.mintAsset(to, uri, assetType, location || "", valuation, propertyId || "");
    const receipt = await tx.wait();

    // Decode tokenId from ERC-721 Transfer event (raw log topics)
    // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
    let tokenId = null;
    for (const log of receipt.logs) {
      if (log.topics[0] === TRANSFER_TOPIC && log.topics.length === 4) {
        const from = "0x" + log.topics[1].slice(26);
        if (from === "0x" + "0".repeat(40)) {
          tokenId = Number(BigInt(log.topics[3]));
          break;
        }
      }
    }

    // Save to local DB
    db.prepare(
      `INSERT OR REPLACE INTO nfts (token_id, owner_address, asset_type, location, valuation_wei, token_uri, property_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(tokenId, to.toLowerCase(), assetType, location || "", valuation.toString(), uri, propertyId || null);

    res.status(201).json({
      success: true,
      tokenId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
