/**
 * Seed script — populates the database with initial property data.
 * Run: node src/db/seed.js
 */
require("dotenv").config();
const { getDb } = require("./database");

const { properties } = require("../../../blockchain/properties-config");

function seed() {
  const db = getDb();

  const insertProperty = db.prepare(`
    INSERT OR REPLACE INTO properties (
      id, title, description, address, city, zip_code, type,
      price, surface, rooms, bedrooms, year_built, status, images, featured,
      token_symbol, token_name, total_tokens, token_price_wei,
      annual_rent, annual_charges, net_yield, gross_yield, occupancy_rate
    ) VALUES (
      @id, @title, @description, @address, @city, @zip_code, @type,
      @price, @surface, @rooms, @bedrooms, @year_built, @status, @images, @featured,
      @token_symbol, @token_name, @total_tokens, @token_price_wei,
      @annual_rent, @annual_charges, @net_yield, @gross_yield, @occupancy_rate
    )
  `);

  const insertMany = db.transaction((props) => {
    for (const prop of props) {
      insertProperty.run(prop);
    }
  });

  insertMany(properties);
  console.log(`[Seed] Inserted ${properties.length} properties`);

  // Set token_address for properties from deployed addresses if available
  try {
    const fs = require("fs");
    const path = require("path");
    const addressesPath = path.join(__dirname, "..", "..", "..", "blockchain", "deployed-addresses.json");
    if (fs.existsSync(addressesPath)) {
      const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
      const updateTokenAddress = db.prepare("UPDATE properties SET token_address = ? WHERE id = ?");

      for (const prop of properties) {
        if (prop.token_symbol && addresses[`PropertyToken_${prop.token_symbol}`]) {
          const tokenAddress = addresses[`PropertyToken_${prop.token_symbol}`];
          updateTokenAddress.run(tokenAddress, prop.id);
          console.log(`[Seed] Set token_address for ${prop.id} (${prop.token_symbol}): ${tokenAddress}`);
        }
      }
    }
  } catch (error) {
    console.log("[Seed] Error updating token addresses:", error.message);
    console.log("[Seed] No deployed addresses found or an error occurred, skipping token_address update");
  }
}

seed();
console.log("[Seed] Done!");
