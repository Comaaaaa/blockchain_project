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
