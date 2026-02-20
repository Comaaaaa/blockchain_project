const { getProvider, getContract, getAddresses } = require("./blockchain");
const { ethers } = require("ethers");
const { getDb } = require("../db/database");

/**
 * Indexer service — polls blockchain events and syncs to the SQLite database.
 * Runs every interval (default: 60 seconds).
 * Tracks the last processed block to avoid re-indexing.
 * Handles RPC providers with limited block range (e.g. Alchemy free tier: 10 blocks max).
 */

const MAX_BLOCK_RANGE = 10; // Alchemy free tier limit
const V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];
const V2_PAIR_ABI = [
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

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

    const result = db.prepare(
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

    // Update tokens_sold and status if the transaction was actually inserted
    if (result.changes > 0) {
      db.prepare(
        `UPDATE properties
         SET tokens_sold = tokens_sold + ?,
             status = CASE
               WHEN tokens_sold + ? >= total_tokens THEN 'funded'
               ELSE 'funding'
             END,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(parseInt(amount), parseInt(amount), propertyId);
    }
  }

  if (events.length > 0) console.log(`[Indexer] Token purchases: ${events.length} events`);
}

async function indexMarketplaceEvents(db, marketplace, fromBlock, toBlock) {
  // Listing created
  const createdFilter = marketplace.filters.ListingCreated();
  const createdEvents = await marketplace.queryFilter(createdFilter, fromBlock, toBlock);
  const propertyByTokenStmt = db.prepare(
    `SELECT id FROM properties WHERE LOWER(token_address) = ?`
  );

  for (const event of createdEvents) {
    const listingId = event.args[0].toString();
    const seller = event.args[1];
    const tokenAddress = event.args[2];
    const amount = event.args[3].toString();
    const pricePerToken = event.args[4].toString();

    // Resolve token_address to property_id
    const property = propertyByTokenStmt.get(tokenAddress.toLowerCase());
    const propertyId = property ? property.id : null;

    db.prepare(
      `INSERT OR REPLACE INTO marketplace_listings (listing_id_onchain, seller_address, token_address, property_id, amount, price_per_token_wei, listing_status, active, tx_hash)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)`
    ).run(
      parseInt(listingId),
      seller.toLowerCase(),
      tokenAddress.toLowerCase(),
      propertyId,
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

    const listingRow = db
      .prepare(
        `SELECT seller_address, property_id, token_address
         FROM marketplace_listings
         WHERE listing_id_onchain = ?`
      )
      .get(parseInt(listingId));

    db.prepare(
      `UPDATE marketplace_listings SET active = 0, listing_status = 'sold' WHERE listing_id_onchain = ?`
    ).run(parseInt(listingId));

    db.prepare(
      `INSERT INTO transactions (id, type, property_id, token_address, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, 'listing_sold', ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
       ON CONFLICT(tx_hash) DO UPDATE SET
         type = 'listing_sold',
         property_id = excluded.property_id,
         token_address = excluded.token_address,
         from_address = excluded.from_address,
         to_address = excluded.to_address,
         tokens = excluded.tokens,
         total_amount_wei = excluded.total_amount_wei,
         block_number = excluded.block_number,
         status = excluded.status`
    ).run(
      `tx-${event.transactionHash.slice(0, 16)}`,
      listingRow?.property_id || null,
      listingRow?.token_address || null,
      listingRow?.seller_address || "marketplace",
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
      `UPDATE marketplace_listings SET active = 0, listing_status = 'cancelled' WHERE listing_id_onchain = ?`
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

async function indexNFTMarketplaceEvents(db, nftMarketplace, fromBlock, toBlock) {
  // NFTListed events
  const listedFilter = nftMarketplace.filters.NFTListed();
  const listedEvents = await nftMarketplace.queryFilter(listedFilter, fromBlock, toBlock);

  for (const event of listedEvents) {
    const listingId = event.args[0].toString();
    const seller = event.args[1];
    const nftContract = event.args[2];
    const tokenId = event.args[3].toString();
    const price = event.args[4].toString();

    db.prepare(
      `INSERT OR REPLACE INTO nft_listings (listing_id_onchain, seller_address, nft_contract, nft_token_id, price_wei, active, tx_hash)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(
      parseInt(listingId),
      seller.toLowerCase(),
      nftContract.toLowerCase(),
      parseInt(tokenId),
      price,
      event.transactionHash
    );
  }

  // NFTSold events
  const soldFilter = nftMarketplace.filters.NFTSold();
  const soldEvents = await nftMarketplace.queryFilter(soldFilter, fromBlock, toBlock);

  for (const event of soldEvents) {
    const listingId = event.args[0].toString();
    const buyer = event.args[1];
    const tokenId = event.args[2].toString();
    const price = event.args[3].toString();
    const tokenIdInt = parseInt(tokenId);

    const listingRow = db
      .prepare(
        `SELECT seller_address FROM nft_listings WHERE listing_id_onchain = ?`
      )
      .get(parseInt(listingId));

    db.prepare(
      `UPDATE nft_listings SET active = 0, buyer_address = ? WHERE listing_id_onchain = ?`
    ).run(buyer.toLowerCase(), parseInt(listingId));

    // Update NFT owner
    db.prepare(
      `UPDATE nfts SET owner_address = ? WHERE token_id = ?`
    ).run(buyer.toLowerCase(), tokenIdInt);

    const nftRow = db.prepare(
      `SELECT property_id FROM nfts WHERE token_id = ?`
    ).get(tokenIdInt);

    db.prepare(
      `INSERT INTO transactions (id, type, property_id, token_address, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
       VALUES (?, 'listing_sold', ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
       ON CONFLICT(tx_hash) DO UPDATE SET
         type = 'listing_sold',
         property_id = excluded.property_id,
         token_address = excluded.token_address,
         from_address = excluded.from_address,
         to_address = excluded.to_address,
         tokens = excluded.tokens,
         total_amount_wei = excluded.total_amount_wei,
         block_number = excluded.block_number,
         status = excluded.status`
    ).run(
      `tx-${event.transactionHash.slice(0, 16)}-nft`,
      nftRow?.property_id || null,
      `nft:${tokenIdInt}`,
      listingRow?.seller_address || "nft_marketplace",
      buyer.toLowerCase(),
      1,
      price,
      event.transactionHash,
      event.blockNumber
    );
  }

  // NFTListingCancelled events
  const cancelledFilter = nftMarketplace.filters.NFTListingCancelled();
  const cancelledEvents = await nftMarketplace.queryFilter(cancelledFilter, fromBlock, toBlock);

  for (const event of cancelledEvents) {
    const listingId = event.args[0].toString();
    db.prepare(
      `UPDATE nft_listings SET active = 0 WHERE listing_id_onchain = ?`
    ).run(parseInt(listingId));
  }

  const total = listedEvents.length + soldEvents.length + cancelledEvents.length;
  if (total > 0) console.log(`[Indexer] NFT Marketplace: ${total} events`);
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

async function getDexPairAddress(factoryAddress, tokenAddress, wethAddress) {
  if (!factoryAddress || !tokenAddress || !wethAddress) return null;
  const provider = getProvider();
  const factory = new ethers.Contract(factoryAddress, V2_FACTORY_ABI, provider);
  const pairAddress = await factory.getPair(tokenAddress, wethAddress);
  if (!pairAddress || pairAddress === ethers.ZeroAddress) return null;
  return pairAddress;
}

async function indexExternalDexSwapEvents(db, fromBlock, toBlock) {
  const addresses = getAddresses();
  const tokenAddress = addresses.PropertyToken_PAR7E;
  const wethAddress = process.env.WETH_ADDRESS;
  if (!tokenAddress || !wethAddress) return;

  const dexConfigs = [
    { dex: "uniswap", factory: process.env.UNISWAP_V2_FACTORY_ADDRESS },
    { dex: "sushiswap", factory: process.env.SUSHISWAP_V2_FACTORY_ADDRESS },
  ];

  const provider = getProvider();

  for (const dexCfg of dexConfigs) {
    if (!dexCfg.factory) continue;

    let pairAddress;
    try {
      pairAddress = await getDexPairAddress(dexCfg.factory, tokenAddress, wethAddress);
    } catch {
      continue;
    }
    if (!pairAddress) continue;

    const pair = new ethers.Contract(pairAddress, V2_PAIR_ABI, provider);
    const [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
    const swapFilter = pair.filters.Swap();
    const swapEvents = await pair.queryFilter(swapFilter, fromBlock, toBlock);

    for (const event of swapEvents) {
      const sender = event.args[0];
      const amount0In = event.args[1];
      const amount1In = event.args[2];
      const amount0Out = event.args[3];
      const amount1Out = event.args[4];
      const to = event.args[5];

      const tokenIs0 = token0.toLowerCase() === tokenAddress.toLowerCase();
      const wethIs0 = token0.toLowerCase() === wethAddress.toLowerCase();

      const tokenIn = tokenIs0 ? amount0In : amount1In;
      const tokenOut = tokenIs0 ? amount0Out : amount1Out;
      const ethIn = wethIs0 ? amount0In : amount1In;
      const ethOut = wethIs0 ? amount0Out : amount1Out;

      const tokens = tokenIn > 0n ? tokenIn.toString() : tokenOut.toString();
      const totalWei = ethIn > 0n ? ethIn.toString() : ethOut.toString();

      db.prepare(
        `INSERT OR IGNORE INTO transactions (id, type, from_address, to_address, tokens, total_amount_wei, tx_hash, block_number, status)
         VALUES (?, 'swap', ?, ?, ?, ?, ?, ?, 'confirmed')`
      ).run(
        `tx-${event.transactionHash.slice(0, 16)}-${dexCfg.dex}`,
        sender.toLowerCase(),
        to.toLowerCase(),
        tokens,
        totalWei,
        event.transactionHash,
        event.blockNumber
      );
    }

    if (swapEvents.length > 0) {
      console.log(`[Indexer] ${dexCfg.dex} swaps: ${swapEvents.length} events`);
    }
  }
}

/**
 * Scan a block range in batches of MAX_BLOCK_RANGE to respect RPC provider limits.
 */
async function scanInBatches(db, contracts, fromBlock, toBlock) {
  const { compliance, propertyToken, marketplace, nftMarketplace, swapPool, oracle } = contracts;

  for (let batchStart = fromBlock; batchStart <= toBlock; batchStart += MAX_BLOCK_RANGE) {
    const batchEnd = Math.min(batchStart + MAX_BLOCK_RANGE - 1, toBlock);

    await indexComplianceEvents(db, compliance, batchStart, batchEnd);
    await indexTokenPurchases(db, propertyToken, batchStart, batchEnd);
    await indexMarketplaceEvents(db, marketplace, batchStart, batchEnd);
    await indexNFTMarketplaceEvents(db, nftMarketplace, batchStart, batchEnd);
    await indexSwapEvents(db, swapPool, batchStart, batchEnd);
    await indexOracleEvents(db, oracle, batchStart, batchEnd);
    await indexExternalDexSwapEvents(db, batchStart, batchEnd);

    // Save progress after each batch so we don't re-scan on crash
    setLastBlock(db, batchEnd);
  }
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

    const blockRange = currentBlock - fromBlock;
    console.log(`[Indexer] Scanning blocks ${fromBlock} -> ${currentBlock} (${blockRange + 1} blocks)`);

    const compliance = await getContract("ComplianceRegistry");
    const propertyToken = await getContract("PropertyToken");
    const marketplace = await getContract("PropertyMarketplace");
    const nftMarketplace = await getContract("NFTMarketplace");
    const swapPool = await getContract("TokenSwapPool");
    const oracle = await getContract("PriceOracle");

    const contracts = { compliance, propertyToken, marketplace, nftMarketplace, swapPool, oracle };

    if (blockRange >= MAX_BLOCK_RANGE) {
      // Scan in batches for RPC providers with block range limits
      await scanInBatches(db, contracts, fromBlock, currentBlock);
    } else {
      // Small range, scan in one go
      await indexComplianceEvents(db, compliance, fromBlock, currentBlock);
      await indexTokenPurchases(db, propertyToken, fromBlock, currentBlock);
      await indexMarketplaceEvents(db, marketplace, fromBlock, currentBlock);
      await indexNFTMarketplaceEvents(db, nftMarketplace, fromBlock, currentBlock);
      await indexSwapEvents(db, swapPool, fromBlock, currentBlock);
      await indexOracleEvents(db, oracle, fromBlock, currentBlock);
      await indexExternalDexSwapEvents(db, fromBlock, currentBlock);
      setLastBlock(db, currentBlock);
    }

    console.log(`[Indexer] Synced to block ${currentBlock}`);
  } catch (error) {
    console.error("[Indexer] Error:", error.message);
  }
}

module.exports = { runIndexer };
