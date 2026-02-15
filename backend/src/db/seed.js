/**
 * Seed script — populates the database with initial property data.
 * Run: node src/db/seed.js
 */
require("dotenv").config();
const { getDb } = require("./database");

const { properties, ETH_EUR_RATE } = require("../../../blockchain/properties-config");

function seed() {
  const db = getDb();

  const insertProperty = db.prepare(`
    INSERT INTO properties (
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
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      address = excluded.address,
      city = excluded.city,
      zip_code = excluded.zip_code,
      type = excluded.type,
      price = excluded.price,
      surface = excluded.surface,
      rooms = excluded.rooms,
      bedrooms = excluded.bedrooms,
      year_built = excluded.year_built,
      status = excluded.status,
      images = excluded.images,
      featured = excluded.featured,
      token_symbol = excluded.token_symbol,
      token_name = excluded.token_name,
      total_tokens = excluded.total_tokens,
      token_price_wei = excluded.token_price_wei,
      annual_rent = excluded.annual_rent,
      annual_charges = excluded.annual_charges,
      net_yield = excluded.net_yield,
      gross_yield = excluded.gross_yield,
      occupancy_rate = excluded.occupancy_rate
  `);

  const insertMany = db.transaction((props) => {
    for (const prop of props) {
      insertProperty.run(prop);
    }
  });

  insertMany(properties);
  console.log(`[Seed] Inserted ${properties.length} properties`);

  // Seed NFTs linked to the first 3 properties
  // Valorisation = prix du bien en ETH (prix EUR / taux ETH/EUR), converti en wei
  function computeValuationWei(priceEUR) {
    const ethValue = priceEUR / ETH_EUR_RATE;
    return BigInt(Math.round(ethValue * 1e18)).toString();
  }

  const nftProperties = properties.slice(0, 3);
  const nfts = nftProperties.map((p, i) => ({
    token_id: i,
    owner_address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    asset_type: "property_deed",
    location: `${p.address}, ${p.zip_code} ${p.city}`,
    valuation_wei: computeValuationWei(p.price),
    token_uri: `ipfs://QmTokenImmo/${p.id}`,
    property_id: p.id,
  }));

  const insertNft = db.prepare(`
    INSERT INTO nfts (token_id, owner_address, asset_type, location, valuation_wei, token_uri, property_id)
    VALUES (@token_id, @owner_address, @asset_type, @location, @valuation_wei, @token_uri, @property_id)
    ON CONFLICT(token_id) DO UPDATE SET
      owner_address = excluded.owner_address,
      asset_type = excluded.asset_type,
      location = excluded.location,
      valuation_wei = excluded.valuation_wei,
      token_uri = excluded.token_uri,
      property_id = excluded.property_id
  `);

  const insertManyNfts = db.transaction((items) => {
    for (const item of items) {
      insertNft.run(item);
    }
  });

  insertManyNfts(nfts);
  console.log(`[Seed] Inserted ${nfts.length} NFTs linked to properties`);

  // Set token_address for prop-001 from deployed addresses if available
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
