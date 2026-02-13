// Contract ABIs (minimal - only the functions we use from the frontend)
// Full ABIs are served from the backend at /api/contracts/abis

export const PropertyTokenABI = [
  { inputs: [{ name: 'amount', type: 'uint256' }], name: 'buyTokens', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [], name: 'tokenPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'availableTokens', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'maxSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'propertyId', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'approve', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'buyer', type: 'address' }, { indexed: false, name: 'amount', type: 'uint256' }, { indexed: false, name: 'totalCost', type: 'uint256' }], name: 'TokensPurchased', type: 'event' },
] as const;

export const ComplianceRegistryABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'isCompliant', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'isWhitelisted', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'isBlacklisted', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'getKycTimestamp', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

export const PropertyMarketplaceABI = [
  { inputs: [{ name: 'tokenAddress', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'pricePerToken', type: 'uint256' }], name: 'createListing', outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'listingId', type: 'uint256' }], name: 'buyListing', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: 'listingId', type: 'uint256' }], name: 'cancelListing', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'listingId', type: 'uint256' }], name: 'getListing', outputs: [{ components: [{ name: 'id', type: 'uint256' }, { name: 'seller', type: 'address' }, { name: 'tokenAddress', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'pricePerToken', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'createdAt', type: 'uint256' }], type: 'tuple' }], stateMutability: 'view', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'listingId', type: 'uint256' }, { indexed: true, name: 'seller', type: 'address' }, { indexed: true, name: 'tokenAddress', type: 'address' }, { indexed: false, name: 'amount', type: 'uint256' }, { indexed: false, name: 'pricePerToken', type: 'uint256' }], name: 'ListingCreated', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, name: 'listingId', type: 'uint256' }, { indexed: true, name: 'buyer', type: 'address' }, { indexed: false, name: 'amount', type: 'uint256' }, { indexed: false, name: 'totalPrice', type: 'uint256' }], name: 'ListingSold', type: 'event' },
] as const;

export const TokenSwapPoolABI = [
  { inputs: [{ name: 'tokenAmount', type: 'uint256' }], name: 'addLiquidity', outputs: [{ type: 'uint256' }], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: 'lpAmount', type: 'uint256' }], name: 'removeLiquidity', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'swapETHForToken', outputs: [], stateMutability: 'payable', type: 'function' },
  { inputs: [{ name: 'tokenIn', type: 'uint256' }], name: 'swapTokenForETH', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'ethIn', type: 'uint256' }], name: 'getTokenOutForETH', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'tokenIn', type: 'uint256' }], name: 'getETHOutForToken', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getSpotPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'reserveToken', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'reserveETH', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '', type: 'address' }], name: 'liquidity', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'user', type: 'address' }, { indexed: false, name: 'ethIn', type: 'uint256' }, { indexed: false, name: 'tokenOut', type: 'uint256' }], name: 'SwapETHForToken', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, name: 'user', type: 'address' }, { indexed: false, name: 'tokenIn', type: 'uint256' }, { indexed: false, name: 'ethOut', type: 'uint256' }], name: 'SwapTokenForETH', type: 'event' },
] as const;

export const PriceOracleABI = [
  { inputs: [{ name: 'token', type: 'address' }], name: 'getPrice', outputs: [{ name: 'price', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'confidence', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'token', type: 'address' }, { name: 'maxAge', type: 'uint256' }], name: 'isPriceStale', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
] as const;

export const PropertyNFTABI = [
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'ownerOf', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'tokenURI', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalMinted', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'nftMetadata', outputs: [{ name: 'assetType', type: 'string' }, { name: 'location', type: 'string' }, { name: 'valuation', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

// Contract addresses — loaded from backend or env
export function getContractAddresses(): Record<string, string> {
  return {
    ComplianceRegistry: process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY || '',
    PriceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE || '',
    PropertyToken_PAR7E: process.env.NEXT_PUBLIC_PROPERTY_TOKEN || '',
    PropertyNFT: process.env.NEXT_PUBLIC_PROPERTY_NFT || '',
    PropertyMarketplace: process.env.NEXT_PUBLIC_PROPERTY_MARKETPLACE || '',
    TokenSwapPool: process.env.NEXT_PUBLIC_TOKEN_SWAP_POOL || '',
  };
}
