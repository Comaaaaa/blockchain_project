const express = require("express");
const { getDb } = require("../db/database");
const { getContract } = require("../services/blockchain");

const router = express.Router();

// GET /api/nfts — List all NFTs
router.get("/", (req, res) => {
  const db = getDb();
  const nfts = db.prepare("SELECT * FROM nfts ORDER BY created_at DESC").all();
  res.json(nfts);
});

// GET /api/nfts/:tokenId — Get single NFT (from DB, with on-chain fallback)
router.get("/:tokenId", async (req, res) => {
  const tokenId = parseInt(req.params.tokenId);
  const db = getDb();
  const row = db.prepare("SELECT * FROM nfts WHERE token_id = ?").get(tokenId);

  if (row) {
    return res.json({
      tokenId: row.token_id,
      owner: row.owner_address,
      tokenURI: row.token_uri,
      assetType: row.asset_type,
      location: row.location,
      valuationWei: row.valuation_wei,
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
      mintedAt: Number(metadata.mintedAt),
    });
  } catch (error) {
    res.status(404).json({ error: "NFT not found" });
  }
});

// POST /api/nfts/mint — Mint a new NFT (admin)
router.post("/mint", async (req, res) => {
  const { to, uri, assetType, location, valuationWei } = req.body;

  if (!to || !uri || !assetType) {
    return res.status(400).json({ error: "to, uri, assetType required" });
  }

  try {
    const { ethers } = require("ethers");
    const nft = await getContract("PropertyNFT");
    const valuation = valuationWei || ethers.parseEther("1").toString();

    const tx = await nft.mintAsset(to, uri, assetType, location || "", valuation);
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
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO nfts (token_id, owner_address, asset_type, location, valuation_wei, token_uri)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(tokenId, to.toLowerCase(), assetType, location || "", valuation.toString(), uri);

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
