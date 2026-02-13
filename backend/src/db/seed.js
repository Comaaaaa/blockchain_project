/**
 * Seed script — populates the database with initial property data.
 * Run: node src/db/seed.js
 */
require("dotenv").config();
const { getDb } = require("./database");

const properties = [
  {
    id: "prop-001",
    title: "Appartement Haussmannien - Paris 7e",
    description: "Magnifique appartement haussmannien au cœur du 7e arrondissement de Paris, à proximité de la Tour Eiffel.",
    address: "15 Rue de Grenelle",
    city: "Paris",
    zip_code: "75007",
    type: "apartment",
    price: 520000,
    surface: 85,
    rooms: 4,
    bedrooms: 2,
    year_built: 1890,
    status: "available",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    ]),
    featured: 1,
    token_symbol: "PAR7E",
    token_name: "Appartement Paris 7e",
    total_tokens: 1000,
    token_price_wei: "1000000000000000", // 0.001 ETH
    annual_rent: 24000,
    annual_charges: 4800,
    net_yield: 3.69,
    gross_yield: 4.62,
    occupancy_rate: 95,
  },
  {
    id: "prop-002",
    title: "Loft Moderne - Lyon Confluence",
    description: "Loft contemporain dans le quartier innovant de la Confluence à Lyon.",
    address: "22 Quai Perrache",
    city: "Lyon",
    zip_code: "69002",
    type: "apartment",
    price: 380000,
    surface: 120,
    rooms: 5,
    bedrooms: 3,
    year_built: 2015,
    status: "available",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    ]),
    featured: 0,
    token_symbol: "LYONC",
    token_name: "Loft Lyon Confluence",
    total_tokens: 760,
    token_price_wei: "700000000000000", // 0.0007 ETH
    annual_rent: 18000,
    annual_charges: 3600,
    net_yield: 3.79,
    gross_yield: 4.74,
    occupancy_rate: 92,
  },
  {
    id: "prop-003",
    title: "Villa Vue Mer - Nice",
    description: "Superbe villa avec vue panoramique sur la Baie des Anges à Nice.",
    address: "8 Boulevard de la Mer",
    city: "Nice",
    zip_code: "06000",
    type: "house",
    price: 890000,
    surface: 200,
    rooms: 7,
    bedrooms: 4,
    year_built: 1975,
    status: "funding",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    ]),
    featured: 1,
    token_symbol: "NICEV",
    token_name: "Villa Nice Vue Mer",
    total_tokens: 1780,
    token_price_wei: "800000000000000", // 0.0008 ETH
    annual_rent: 48000,
    annual_charges: 9600,
    net_yield: 4.31,
    gross_yield: 5.39,
    occupancy_rate: 88,
  },
  {
    id: "prop-004",
    title: "Local Commercial - Bordeaux Chartrons",
    description: "Local commercial idéalement situé dans le quartier des Chartrons à Bordeaux.",
    address: "45 Rue Notre-Dame",
    city: "Bordeaux",
    zip_code: "33000",
    type: "commercial",
    price: 310000,
    surface: 95,
    rooms: 3,
    bedrooms: 0,
    year_built: 1920,
    status: "available",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
    ]),
    featured: 1,
    token_symbol: "BDXCH",
    token_name: "Commercial Bordeaux Chartrons",
    total_tokens: 620,
    token_price_wei: "750000000000000",
    annual_rent: 21000,
    annual_charges: 4200,
    net_yield: 5.42,
    gross_yield: 6.77,
    occupancy_rate: 97,
  },
  {
    id: "prop-005",
    title: "Penthouse - Paris 16e",
    description: "Penthouse d'exception dans le 16e arrondissement avec vue sur la Seine.",
    address: "3 Avenue du Président Kennedy",
    city: "Paris",
    zip_code: "75016",
    type: "apartment",
    price: 1250000,
    surface: 180,
    rooms: 6,
    bedrooms: 3,
    year_built: 2005,
    status: "funded",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
    ]),
    featured: 1,
    token_symbol: "PAR16",
    token_name: "Penthouse Paris 16e",
    total_tokens: 2500,
    token_price_wei: "900000000000000",
    annual_rent: 60000,
    annual_charges: 12000,
    net_yield: 3.84,
    gross_yield: 4.80,
    occupancy_rate: 100,
  },
  {
    id: "prop-006",
    title: "Maison de Ville - Toulouse",
    description: "Charmante maison de ville rénovée dans le centre historique de Toulouse.",
    address: "12 Rue du Taur",
    city: "Toulouse",
    zip_code: "31000",
    type: "house",
    price: 420000,
    surface: 140,
    rooms: 6,
    bedrooms: 3,
    year_built: 1850,
    status: "available",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
    ]),
    featured: 0,
    token_symbol: "TLSCT",
    token_name: "Maison Toulouse Centre",
    total_tokens: 840,
    token_price_wei: "750000000000000",
    annual_rent: 22800,
    annual_charges: 4560,
    net_yield: 4.34,
    gross_yield: 5.43,
    occupancy_rate: 93,
  },
];

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

  // Set token_address for prop-001 from deployed addresses if available
  try {
    const fs = require("fs");
    const path = require("path");
    const addressesPath = path.join(__dirname, "..", "..", "..", "blockchain", "deployed-addresses.json");
    if (fs.existsSync(addressesPath)) {
      const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
      if (addresses.PropertyToken_PAR7E) {
        db.prepare("UPDATE properties SET token_address = ? WHERE id = 'prop-001'").run(
          addresses.PropertyToken_PAR7E
        );
        console.log(`[Seed] Set token_address for prop-001: ${addresses.PropertyToken_PAR7E}`);
      }
    }
  } catch {
    console.log("[Seed] No deployed addresses found, skipping token_address update");
  }
}

seed();
console.log("[Seed] Done!");
