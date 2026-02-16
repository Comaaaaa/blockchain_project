const express = require("express");
const { getDb } = require("../db/database");

const router = express.Router();

// GET /api/transactions — All transactions
router.get("/", (req, res) => {
  const db = getDb();
  const { type, address, limit } = req.query;

  let query = `
    SELECT t.*, p.title as property_title
    FROM transactions t
    LEFT JOIN properties p ON t.property_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    query += " AND t.type = ?";
    params.push(type);
  }
  if (address) {
    query += " AND (t.from_address = ? OR t.to_address = ?)";
    params.push(address.toLowerCase(), address.toLowerCase());
  }

  query += " ORDER BY t.created_at DESC";

  if (limit) {
    query += " LIMIT ?";
    params.push(parseInt(limit));
  }

  const transactions = db.prepare(query).all(...params);
  res.json(transactions);
});

// POST /api/transactions — Record a new transaction
router.post("/", (req, res) => {
  const db = getDb();
  const { id, type, property_id, token_address, from_address, to_address, tokens, swap_direction, price_per_token_wei, total_amount_wei, tx_hash, block_number, status } = req.body;

  const normalizedSwapDirection =
    typeof swap_direction === "string" ? swap_direction.toLowerCase() : null;
  if (
    normalizedSwapDirection !== null &&
    normalizedSwapDirection !== "eth_to_token" &&
    normalizedSwapDirection !== "token_to_eth"
  ) {
    return res.status(400).json({
      error: "swap_direction must be eth_to_token or token_to_eth",
    });
  }

  if (!tx_hash) {
    return res.status(400).json({ error: "tx_hash is required" });
  }

  try {
    const result = db.prepare(
      `INSERT OR IGNORE INTO transactions (id, type, property_id, token_address, from_address, to_address, tokens, swap_direction, price_per_token_wei, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id || `tx-${tx_hash.slice(0, 16)}`,
      type || "purchase",
      property_id || null,
      token_address || null,
      from_address ? from_address.toLowerCase() : null,
      to_address ? to_address.toLowerCase() : null,
      tokens || 0,
      normalizedSwapDirection,
      price_per_token_wei || null,
      total_amount_wei || null,
      tx_hash,
      block_number || null,
      status || "confirmed"
    );

    // Update tokens_sold and status for purchase transactions
    const txType = type || "purchase";
    if (result.changes > 0 && txType === "purchase" && property_id && tokens) {
      db.prepare(
        `UPDATE properties
         SET tokens_sold = tokens_sold + ?,
             status = CASE
               WHEN tokens_sold + ? >= total_tokens THEN 'funded'
               ELSE 'funding'
             END,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(tokens, tokens, property_id);
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("[Transactions] POST error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions/:txHash — Get by tx hash
router.get("/hash/:txHash", (req, res) => {
  const db = getDb();
  const tx = db.prepare("SELECT * FROM transactions WHERE tx_hash = ?").get(req.params.txHash);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  res.json(tx);
});

// GET /api/transactions/address/:address — Transactions for an address
router.get("/address/:address", (req, res) => {
  const db = getDb();
  const address = req.params.address.toLowerCase();
  const transactions = db
    .prepare(
      `SELECT t.*, p.title as property_title
       FROM transactions t
       LEFT JOIN properties p ON t.property_id = p.id
       WHERE t.from_address = ? OR t.to_address = ?
       ORDER BY t.created_at DESC`
    )
    .all(address, address);
  res.json(transactions);
});

module.exports = router;
