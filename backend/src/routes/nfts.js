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

// GET /api/nfts/:tokenId — Get single NFT
router.get("/:tokenId", async (req, res) => {
  try {
    const nft = await getContract("PropertyNFT");
    const tokenId = parseInt(req.params.tokenId);

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
    res.status(500).json({ error: error.message });
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

    // Find the NFTMinted event
    const event = receipt.logs.find((log) => {
      try {
        const parsed = nft.interface.parseLog(log);
        return parsed.name === "NFTMinted";
      } catch {
        return false;
      }
    });

    let tokenId = null;
    if (event) {
      const parsed = nft.interface.parseLog(event);
      tokenId = Number(parsed.args[0]);
    }

    // Save to local DB
    const db = getDb();
    if (tokenId !== null) {
      db.prepare(
        `INSERT OR REPLACE INTO nfts (token_id, owner_address, asset_type, location, valuation_wei, token_uri)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(tokenId, to.toLowerCase(), assetType, location || "", valuation.toString(), uri);
    }

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
