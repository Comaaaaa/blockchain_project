const express = require("express");
const { getAddresses, ABIs } = require("../services/blockchain");

const router = express.Router();

// GET /api/contracts — Get deployed contract addresses and ABIs
router.get("/", (req, res) => {
  const addresses = getAddresses();
  res.json({ addresses });
});

// GET /api/contracts/abis — Get all ABIs
router.get("/abis", (req, res) => {
  res.json(ABIs);
});

// GET /api/contracts/abis/:name — Get ABI for a specific contract
router.get("/abis/:name", (req, res) => {
  const name = req.params.name;
  if (!ABIs[name]) return res.status(404).json({ error: `ABI not found: ${name}` });
  res.json(ABIs[name]);
});

module.exports = router;
