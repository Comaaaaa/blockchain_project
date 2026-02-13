const express = require("express");
const { getLatestPrice, getPriceHistory } = require("../services/oracle");
const { getAddresses } = require("../services/blockchain");

const router = express.Router();

// GET /api/oracle/price/:tokenAddress — Latest oracle price
router.get("/price/:tokenAddress", async (req, res) => {
  try {
    const price = await getLatestPrice(req.params.tokenAddress);
    if (!price) return res.status(404).json({ error: "No price data" });
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/oracle/prices — All latest prices
router.get("/prices", async (req, res) => {
  try {
    const addresses = getAddresses();
    const tokenAddress = addresses.PropertyToken_PAR7E;
    if (!tokenAddress) return res.json([]);

    const price = await getLatestPrice(tokenAddress);
    res.json({
      [tokenAddress]: price,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/oracle/history/:tokenAddress — Price history
router.get("/history/:tokenAddress", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await getPriceHistory(req.params.tokenAddress, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
