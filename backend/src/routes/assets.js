const express = require("express");
const { ethers } = require("ethers");
const { getDb } = require("../db/database");
const { getContract } = require("../services/blockchain");

const router = express.Router();

async function assertAdmin(actorAddress) {
  if (!actorAddress) {
    throw new Error("actor_address is required");
  }

  const normalized = actorAddress.toLowerCase();
  const compliance = await getContract("ComplianceRegistry");
  const owner = (await compliance.owner()).toLowerCase();

  if (normalized !== owner) {
    throw new Error("Admin rights required");
  }
}

// POST /api/assets/requests — submit a new user tokenization request
router.post("/requests", (req, res) => {
  const db = getDb();
  const {
    owner_address,
    title,
    asset_type,
    location,
    valuation_eur,
    valuation_wei,
    token_uri,
  } = req.body;

  if (!owner_address || !title || !asset_type) {
    return res.status(400).json({ error: "owner_address, title and asset_type are required" });
  }

  const id = `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  try {
    db.prepare(
      `INSERT INTO asset_requests
       (id, owner_address, title, asset_type, location, valuation_eur, valuation_wei, token_uri, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(
      id,
      owner_address.toLowerCase(),
      String(title),
      String(asset_type),
      location ? String(location) : null,
      valuation_eur ? Number(valuation_eur) : null,
      valuation_wei ? String(valuation_wei) : null,
      token_uri ? String(token_uri) : null
    );

    const request = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/assets/requests?owner=0x...&status=pending
router.get("/requests", (req, res) => {
  const db = getDb();
  const { owner, status } = req.query;

  let query = "SELECT * FROM asset_requests WHERE 1=1";
  const params = [];

  if (owner) {
    query += " AND owner_address = ?";
    params.push(String(owner).toLowerCase());
  }

  if (status) {
    query += " AND status = ?";
    params.push(String(status));
  }

  query += " ORDER BY created_at DESC";
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// POST /api/assets/requests/:id/approve — admin only
router.post("/requests/:id/approve", async (req, res) => {
  const db = getDb();
  const { actor_address, admin_note } = req.body;
  const { id } = req.params;

  try {
    await assertAdmin(actor_address);

    const row = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ error: "Request not found" });

    db.prepare(
      `UPDATE asset_requests
       SET status = 'approved', admin_note = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(admin_note ? String(admin_note) : null, id);

    const updated = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    res.json(updated);
  } catch (error) {
    res.status(error.message.includes("Admin rights") ? 403 : 400).json({ error: error.message });
  }
});

// POST /api/assets/requests/:id/reject — admin only
router.post("/requests/:id/reject", async (req, res) => {
  const db = getDb();
  const { actor_address, admin_note } = req.body;
  const { id } = req.params;

  try {
    await assertAdmin(actor_address);

    const row = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    if (!row) return res.status(404).json({ error: "Request not found" });

    db.prepare(
      `UPDATE asset_requests
       SET status = 'rejected', admin_note = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(admin_note ? String(admin_note) : null, id);

    const updated = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    res.json(updated);
  } catch (error) {
    res.status(error.message.includes("Admin rights") ? 403 : 400).json({ error: error.message });
  }
});

// POST /api/assets/requests/:id/tokenize — admin only, mints NFT to requester
router.post("/requests/:id/tokenize", async (req, res) => {
  const db = getDb();
  const { actor_address } = req.body;
  const { id } = req.params;

  try {
    await assertAdmin(actor_address);

    const request = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "approved") {
      return res.status(400).json({ error: "Request must be approved before tokenization" });
    }

    const compliance = await getContract("ComplianceRegistry");
    const recipientCompliant = await compliance.isCompliant(request.owner_address);
    if (!recipientCompliant) {
      return res.status(400).json({ error: "Requester wallet is not KYC compliant" });
    }

    const nft = await getContract("PropertyNFT");
    const valuationWei = request.valuation_wei || ethers.parseEther("0.1").toString();
    const tokenUri = request.token_uri || `ipfs://QmTokenImmo/request-${request.id}`;

    const tx = await nft.mintAsset(
      request.owner_address,
      tokenUri,
      request.asset_type,
      request.location || "",
      valuationWei,
      ""
    );
    const receipt = await tx.wait();

    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    let tokenId = null;

    for (const log of receipt.logs) {
      if (log.topics[0] === transferTopic && log.topics.length === 4) {
        const from = `0x${log.topics[1].slice(26)}`;
        if (from === `0x${"0".repeat(40)}`) {
          tokenId = Number(BigInt(log.topics[3]));
          break;
        }
      }
    }

    if (tokenId === null) {
      const totalMinted = await nft.totalMinted();
      tokenId = Number(totalMinted) - 1;
    }

    db.prepare(
      `INSERT OR REPLACE INTO nfts
       (token_id, owner_address, asset_type, location, valuation_wei, token_uri, property_id)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`
    ).run(
      tokenId,
      request.owner_address,
      request.asset_type,
      request.location || "",
      valuationWei,
      tokenUri
    );

    db.prepare(
      `UPDATE asset_requests
       SET status = 'tokenized', nft_token_id = ?, tx_hash = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(tokenId, receipt.hash, id);

    const updated = db.prepare(`SELECT * FROM asset_requests WHERE id = ?`).get(id);
    res.json(updated);
  } catch (error) {
    res.status(error.message.includes("Admin rights") ? 403 : 500).json({ error: error.message });
  }
});

module.exports = router;
