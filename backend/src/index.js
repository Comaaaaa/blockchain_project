require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const { getDb } = require("./db/database");
const { runIndexer } = require("./services/indexer");
const { updateOraclePrices } = require("./services/oracle");

// Routes
const propertiesRouter = require("./routes/properties");
const complianceRouter = require("./routes/compliance");
const marketplaceRouter = require("./routes/marketplace");
const transactionsRouter = require("./routes/transactions");
const oracleRouter = require("./routes/oracle");
const nftsRouter = require("./routes/nfts");
const contractsRouter = require("./routes/contracts");
const assetsRouter = require("./routes/assets");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use("/api/properties", propertiesRouter);
app.use("/api/compliance", complianceRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/oracle", oracleRouter);
app.use("/api/nfts", nftsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/assets", assetsRouter);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    const { getProvider } = require("./services/blockchain");
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    res.json({
      status: "ok",
      blockNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      status: "degraded",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Initialize database
getDb();
console.log("[DB] SQLite database initialized");

// Start server
app.listen(PORT, () => {
  console.log(`[Server] TokenImmo Backend running on port ${PORT}`);
  console.log(`[Server] API: http://localhost:${PORT}/api`);

  // Run indexer immediately on startup, then every minute
  setTimeout(async () => {
    try {
      await runIndexer();
    } catch (error) {
      console.error("[Startup] Indexer first run failed:", error.message);
    }
  }, 2000);

  // Cron: run indexer every minute
  cron.schedule("* * * * *", async () => {
    await runIndexer();
  });

  // Cron: update oracle prices every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    await updateOraclePrices();
  });

  console.log("[Cron] Indexer scheduled: every 1 minute");
  console.log("[Cron] Oracle price updates scheduled: every 5 minutes");
});
