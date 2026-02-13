const express = require("express");
const { getDb } = require("../db/database");
const { getContract } = require("../services/blockchain");

const router = express.Router();

// GET /api/compliance/status/:address — Check KYC status for an address
router.get("/status/:address", async (req, res) => {
  const address = req.params.address.toLowerCase();

  try {
    const compliance = await getContract("ComplianceRegistry");
    const [isCompliant, isWhitelisted, isBlacklisted, kycTimestamp] = await Promise.all([
      compliance.isCompliant(address),
      compliance.isWhitelisted(address),
      compliance.isBlacklisted(address),
      compliance.getKycTimestamp(address),
    ]);

    res.json({
      address,
      isCompliant,
      isWhitelisted,
      isBlacklisted,
      kycTimestamp: Number(kycTimestamp),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/compliance/whitelist — Add address to whitelist (admin only)
router.post("/whitelist", async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });

  try {
    const compliance = await getContract("ComplianceRegistry");
    const tx = await compliance.addToWhitelist(address);
    const receipt = await tx.wait();

    // Update local DB
    const db = getDb();
    db.prepare(
      `INSERT INTO users (id, wallet_address, is_whitelisted, kyc_timestamp)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(wallet_address) DO UPDATE SET is_whitelisted = 1, kyc_timestamp = datetime('now')`
    ).run(address.toLowerCase(), address.toLowerCase());

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/compliance/whitelist/batch — Batch whitelist
router.post("/whitelist/batch", async (req, res) => {
  const { addresses } = req.body;
  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({ error: "Addresses array required" });
  }

  try {
    const compliance = await getContract("ComplianceRegistry");
    const tx = await compliance.batchWhitelist(addresses);
    const receipt = await tx.wait();

    const db = getDb();
    for (const addr of addresses) {
      db.prepare(
        `INSERT INTO users (id, wallet_address, is_whitelisted, kyc_timestamp)
         VALUES (?, ?, 1, datetime('now'))
         ON CONFLICT(wallet_address) DO UPDATE SET is_whitelisted = 1, kyc_timestamp = datetime('now')`
      ).run(addr.toLowerCase(), addr.toLowerCase());
    }

    res.json({ success: true, txHash: receipt.hash, count: addresses.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/compliance/blacklist — Blacklist an address
router.post("/blacklist", async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });

  try {
    const compliance = await getContract("ComplianceRegistry");
    const tx = await compliance.addToBlacklist(address);
    const receipt = await tx.wait();

    const db = getDb();
    db.prepare(
      `UPDATE users SET is_blacklisted = 1, is_whitelisted = 0 WHERE wallet_address = ?`
    ).run(address.toLowerCase());

    res.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/compliance/whitelist/:address — Remove from whitelist
router.delete("/whitelist/:address", async (req, res) => {
  try {
    const compliance = await getContract("ComplianceRegistry");
    const tx = await compliance.removeFromWhitelist(req.params.address);
    const receipt = await tx.wait();

    const db = getDb();
    db.prepare(
      `UPDATE users SET is_whitelisted = 0 WHERE wallet_address = ?`
    ).run(req.params.address.toLowerCase());

    res.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/compliance/blacklist/:address — Remove from blacklist
router.delete("/blacklist/:address", async (req, res) => {
  try {
    const compliance = await getContract("ComplianceRegistry");
    const tx = await compliance.removeFromBlacklist(req.params.address);
    const receipt = await tx.wait();

    const db = getDb();
    db.prepare(
      `UPDATE users SET is_blacklisted = 0 WHERE wallet_address = ?`
    ).run(req.params.address.toLowerCase());

    res.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/compliance/users — List all known users with KYC status
router.get("/users", (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

module.exports = router;
