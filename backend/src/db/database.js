const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "..", "tokenimmo.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      address TEXT,
      city TEXT,
      zip_code TEXT,
      type TEXT CHECK(type IN ('apartment','house','commercial','land')),
      price REAL,
      surface REAL,
      rooms INTEGER,
      bedrooms INTEGER,
      year_built INTEGER,
      status TEXT DEFAULT 'available',
      images TEXT, -- JSON array
      featured INTEGER DEFAULT 0,
      token_address TEXT,
      token_symbol TEXT,
      token_name TEXT,
      total_tokens INTEGER,
      token_price_wei TEXT,
      annual_rent REAL,
      annual_charges REAL,
      net_yield REAL,
      gross_yield REAL,
      occupancy_rate REAL DEFAULT 95,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      wallet_address TEXT UNIQUE NOT NULL,
      name TEXT,
      email TEXT,
      is_whitelisted INTEGER DEFAULT 0,
      is_blacklisted INTEGER DEFAULT 0,
      kyc_timestamp TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('purchase','sale','transfer','swap','listing_created','listing_sold')),
      property_id TEXT,
      token_address TEXT,
      from_address TEXT,
      to_address TEXT,
      tokens INTEGER,
      price_per_token_wei TEXT,
      total_amount_wei TEXT,
      tx_hash TEXT UNIQUE,
      block_number INTEGER,
      gas_used TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id INTEGER PRIMARY KEY,
      listing_id_onchain INTEGER UNIQUE,
      seller_address TEXT NOT NULL,
      token_address TEXT NOT NULL,
      property_id TEXT,
      amount INTEGER,
      price_per_token_wei TEXT,
      active INTEGER DEFAULT 1,
      tx_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    CREATE TABLE IF NOT EXISTS oracle_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_address TEXT NOT NULL,
      price_wei TEXT NOT NULL,
      confidence INTEGER,
      source TEXT DEFAULT 'oracle_contract',
      block_number INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nfts (
      token_id INTEGER PRIMARY KEY,
      owner_address TEXT,
      asset_type TEXT,
      location TEXT,
      valuation_wei TEXT,
      token_uri TEXT,
      minted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { getDb };
