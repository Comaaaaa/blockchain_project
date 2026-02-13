const { getProvider, getContract, getAddresses } = require("./blockchain");
const { getDb } = require("../db/database");

/**
 * Indexer service — polls blockchain events and syncs to the SQLite database.
 * Runs every interval (default: 60 seconds).
 * Tracks the last processed block to avoid re-indexing.
 */

function getLastBlock(db) {
  const row = db.prepare("SELECT value FROM indexer_state WHERE key = 'last_block'").get();
  return row ? parseInt(row.value) : 0;
}

function setLastBlock(db, blockNumber) {
  db.prepare(
    "INSERT INTO indexer_state (key, value) VALUES ('last_block', ?) ON CONFLICT(key) DO UPDATE SET value = ?"
  ).run(String(blockNumber), String(blockNumber));
}

async function indexComplianceEvents(db, compliance, fromBlock, toBlock) {
  // Whitelist events
  const whitelistFilter = compliance.filters.AddressWhitelisted();
  const whitelistEvents = await compliance.queryFilter(whitelistFilter, fromBlock, toBlock);
  for (const event of whitelistEvents) {
    const account = event.args[0];
    const timestamp = event.args[1].toString();
    db.prepare(
      `INSERT INTO users (id, wallet_address, is_whitelisted, kyc_timestamp)
       VALUES (?, ?, 1, datetime(?, 'unixepoch'))
       ON CONFLICT(wallet_address) DO UPDATE SET is_whitelisted = 1, kyc_timestamp = datetime(?, 'unixepoch')`
    ).run(account.toLowerCase(), account.toLowerCase(), timestamp, timestamp);
  }

  // Blacklist events
  const blacklistFilter = compliance.filters.AddressBlacklisted();
  const blacklistEvents = await compliance.queryFilter(blacklistFilter, fromBlock, toBlock);
  for (const event of blacklistEvents) {
    const account = event.args[0];
    db.prepare(
      `UPDATE users SET is_blacklisted = 1, is_whitelisted = 0 WHERE wallet_address = ?`
    ).run(account.toLowerCase());
  }

  // Removed from whitelist
  const removedWLFilter = compliance.filters.AddressRemovedFromWhitelist();
  const removedWLEvents = await compliance.queryFilter(removedWLFilter, fromBlock, toBlock);
  for (const event of removedWLEvents) {
    const account = event.args[0];
    db.prepare(
      `UPDATE users SET is_whitelisted = 0 WHERE wallet_address = ?`
    ).run(account.toLowerCase());
  }

  // Removed from blacklist
  const removedBLFilter = compliance.filters.AddressRemovedFromBlacklist();
  const removedBLEvents = await compliance.queryFilter(removedBLFilter, fromBlock, toBlock);
  for (const event of removedBLEvents) {
    const account = event.args[0];
    db.prepare(
      `UPDATE users SET is_blacklisted = 0 WHERE wallet_address = ?`
    ).run(account.toLowerCase());
  }

  const total = whitelistEvents.length + blacklistEvents.length + removedWLEvents.length + removedBLEvents.length;
  if (total > 0) console.log(`[Indexer] Compliance: ${total} events`);
}

async function indexTokenPurchases(db, propertyToken, fromBlock, toBlock) {
  const filter = propertyToken.filters.TokensPurchased();
  const events = await propertyToken.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    const buyer = event.args[0];
    const amount = event.args[1].toString();
    const totalCost = event.args[2].toString();
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    const tokenAddress = await propertyToken.getAddress();
    const propertyId = await propertyToken.propertyId();

    db.prepare(
      `INSERT OR IGNORE INTO transactions (id, type, property_id, token_address, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    ).run(
      `tx-${txHash.slice(0, 16)}`,
      propertyId,
      tokenAddress,
      "owner",
      buyer.toLowerCase(),
      parseInt(amount),
      totalCost,
      txHash,
      blockNumber
    );
  }

  if (events.length > 0) console.log(`[Indexer] Token purchases: ${events.length} events`);
}

async function indexMarketplaceEvents(db, marketplace, fromBlock, toBlock) {
  // Listing created
  const createdFilter = marketplace.filters.ListingCreated();
  const createdEvents = await marketplace.queryFilter(createdFilter, fromBlock, toBlock);

  for (const event of createdEvents) {
    const listingId = event.args[0].toString();
    const seller = event.args[1];
    const tokenAddress = event.args[2];
    const amount = event.args[3].toString();
    const pricePerToken = event.args[4].toString();

    db.prepare(
      `INSERT OR IGNORE INTO marketplace_listings (listing_id_onchain, seller_address, token_address, amount, price_per_token_wei, active, tx_hash)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(
      parseInt(listingId),
      seller.toLowerCase(),
      tokenAddress.toLowerCase(),
      parseInt(amount),
      pricePerToken,
      event.transactionHash
    );
  }

  // Listing sold
  const soldFilter = marketplace.filters.ListingSold();
  const soldEvents = await marketplace.queryFilter(soldFilter, fromBlock, toBlock);

  for (const event of soldEvents) {
    const listingId = event.args[0].toString();
    const buyer = event.args[1];
    const amount = event.args[2].toString();
    const totalPrice = event.args[3].toString();

    db.prepare(
      `UPDATE marketplace_listings SET active = 0 WHERE listing_id_onchain = ?`
    ).run(parseInt(listingId));

    db.prepare(
      `INSERT OR IGNORE INTO transactions (id, type, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, 'listing_sold', ?, ?, ?, ?, ?, ?, 'confirmed')`
    ).run(
      `tx-${event.transactionHash.slice(0, 16)}`,
      "marketplace",
      buyer.toLowerCase(),
      parseInt(amount),
      totalPrice,
      event.transactionHash,
      event.blockNumber
    );
  }

  // Listing cancelled
  const cancelledFilter = marketplace.filters.ListingCancelled();
  const cancelledEvents = await marketplace.queryFilter(cancelledFilter, fromBlock, toBlock);

  for (const event of cancelledEvents) {
    const listingId = event.args[0].toString();
    db.prepare(
      `UPDATE marketplace_listings SET active = 0 WHERE listing_id_onchain = ?`
    ).run(parseInt(listingId));
  }

  const total = createdEvents.length + soldEvents.length + cancelledEvents.length;
  if (total > 0) console.log(`[Indexer] Marketplace: ${total} events`);
}

async function indexSwapEvents(db, swapPool, fromBlock, toBlock) {
  const ethForTokenFilter = swapPool.filters.SwapETHForToken();
  const ethForTokenEvents = await swapPool.queryFilter(ethForTokenFilter, fromBlock, toBlock);

  for (const event of ethForTokenEvents) {
    const user = event.args[0];
    const ethIn = event.args[1].toString();
    const tokenOut = event.args[2].toString();

    db.prepare(
      `INSERT OR IGNORE INTO transactions (id, type, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, 'swap', 'pool', ?, ?, ?, ?, ?, 'confirmed')`
    ).run(
      `tx-${event.transactionHash.slice(0, 16)}`,
      user.toLowerCase(),
      parseInt(tokenOut),
      ethIn,
      event.transactionHash,
      event.blockNumber
    );
  }

  const tokenForEthFilter = swapPool.filters.SwapTokenForETH();
  const tokenForEthEvents = await swapPool.queryFilter(tokenForEthFilter, fromBlock, toBlock);

  for (const event of tokenForEthEvents) {
    const user = event.args[0];
    const tokenIn = event.args[1].toString();
    const ethOut = event.args[2].toString();

    db.prepare(
      `INSERT OR IGNORE INTO transactions (id, type, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, 'swap', ?, 'pool', ?, ?, ?, ?, 'confirmed')`
    ).run(
      `tx-${event.transactionHash.slice(0, 16)}`,
      user.toLowerCase(),
      parseInt(tokenIn),
      ethOut,
      event.transactionHash,
      event.blockNumber
    );
  }

  const total = ethForTokenEvents.length + tokenForEthEvents.length;
  if (total > 0) console.log(`[Indexer] Swaps: ${total} events`);
}

async function indexOracleEvents(db, oracle, fromBlock, toBlock) {
  const priceFilter = oracle.filters.PriceUpdated();
  const priceEvents = await priceFilter ? await oracle.queryFilter(priceFilter, fromBlock, toBlock) : [];

  for (const event of priceEvents) {
    const tokenAddr = event.args[0];
    const price = event.args[1].toString();
    const confidence = event.args[2].toString();

    db.prepare(
      `INSERT INTO oracle_prices (token_address, price_wei, confidence, block_number)
       VALUES (?, ?, ?, ?)`
    ).run(tokenAddr.toLowerCase(), price, parseInt(confidence), event.blockNumber);
  }

  if (priceEvents.length > 0) console.log(`[Indexer] Oracle prices: ${priceEvents.length} events`);
}

async function runIndexer() {
  const db = getDb();
  const provider = getProvider();

  try {
    const currentBlock = await provider.getBlockNumber();
    const lastBlock = getLastBlock(db);
    const fromBlock = lastBlock > 0 ? lastBlock + 1 : 0;

    if (fromBlock > currentBlock) {
      return; // Nothing new
    }

    console.log(`[Indexer] Scanning blocks ${fromBlock} -> ${currentBlock}`);

    const compliance = await getContract("ComplianceRegistry");
    const propertyToken = await getContract("PropertyToken");
    const marketplace = await getContract("PropertyMarketplace");
    const swapPool = await getContract("TokenSwapPool");
    const oracle = await getContract("PriceOracle");

    await indexComplianceEvents(db, compliance, fromBlock, currentBlock);
    await indexTokenPurchases(db, propertyToken, fromBlock, currentBlock);
    await indexMarketplaceEvents(db, marketplace, fromBlock, currentBlock);
    await indexSwapEvents(db, swapPool, fromBlock, currentBlock);
    await indexOracleEvents(db, oracle, fromBlock, currentBlock);

    setLastBlock(db, currentBlock);
    console.log(`[Indexer] Synced to block ${currentBlock}`);
  } catch (error) {
    console.error("[Indexer] Error:", error.message);
  }
}

module.exports = { runIndexer };
