const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// Properties
export const api = {
  // Properties
  getProperties: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<any[]>(`/properties${query}`);
  },
  getProperty: (id: string) => fetchApi<any>(`/properties/${id}`),
  getFeaturedProperties: () => fetchApi<any[]>('/properties/featured'),
  getPropertyTokenInfo: (id: string) => fetchApi<any>(`/properties/${id}/token-info`),
  createProperty: (data: any) =>
    fetchApi<any>('/properties', { method: 'POST', body: JSON.stringify(data) }),

  // Compliance / KYC
  getComplianceStatus: (address: string) => fetchApi<any>(`/compliance/status/${address}`),
  whitelistAddress: (address: string) =>
    fetchApi<any>('/compliance/whitelist', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),
  batchWhitelist: (addresses: string[]) =>
    fetchApi<any>('/compliance/whitelist/batch', {
      method: 'POST',
      body: JSON.stringify({ addresses }),
    }),
  blacklistAddress: (address: string) =>
    fetchApi<any>('/compliance/blacklist', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),
  removeFromWhitelist: (address: string) =>
    fetchApi<any>(`/compliance/whitelist/${address}`, { method: 'DELETE' }),
  removeFromBlacklist: (address: string) =>
    fetchApi<any>(`/compliance/blacklist/${address}`, { method: 'DELETE' }),
  getComplianceUsers: () => fetchApi<any[]>('/compliance/users'),

  // Marketplace
  getActiveListings: () => fetchApi<any[]>('/marketplace/listings'),
  getAllListings: () => fetchApi<any[]>('/marketplace/listings/all'),
  getListingsBySeller: (address: string) => fetchApi<any[]>(`/marketplace/listings/seller/${address}`),
  getPoolInfo: () => fetchApi<any>('/marketplace/pool'),
  getSwapQuote: (direction: string, amount: string) =>
    fetchApi<any>(`/marketplace/pool/quote?direction=${direction}&amount=${amount}`),
  getDexQuote: (dex: 'uniswap' | 'sushiswap', direction: string, amount: string) =>
    fetchApi<any>(`/marketplace/dex/quote?dex=${dex}&direction=${direction}&amount=${amount}`),
  getDexPairInfo: (dex: 'uniswap' | 'sushiswap') =>
    fetchApi<any>(`/marketplace/dex/pair?dex=${dex}`),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<any[]>(`/transactions${query}`);
  },
  getTransactionsByAddress: (address: string) =>
    fetchApi<any[]>(`/transactions/address/${address}`),
  postTransaction: (data: {
    type: string;
    property_id?: string;
    token_address?: string;
    from_address?: string;
    to_address?: string;
    tokens?: number;
    price_per_token_wei?: string;
    total_amount_wei?: string;
    tx_hash: string;
    block_number?: number;
    status?: string;
  }) =>
    fetchApi<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  // Oracle
  getOraclePrice: (tokenAddress: string) => fetchApi<any>(`/oracle/price/${tokenAddress}`),
  getAllPrices: () => fetchApi<any>('/oracle/prices'),
  getPriceHistory: (tokenAddress: string, limit?: number) =>
    fetchApi<any[]>(`/oracle/history/${tokenAddress}${limit ? `?limit=${limit}` : ''}`),

  // NFTs
  getNFTs: () => fetchApi<any[]>('/nfts'),
  getNFTListings: () => fetchApi<any[]>('/nfts/listings'),
  getNFT: (tokenId: number) => fetchApi<any>(`/nfts/${tokenId}`),
  mintNFT: (data: any) =>
    fetchApi<any>('/nfts/mint', { method: 'POST', body: JSON.stringify(data) }),
  getPropertyNFT: (id: string) => fetchApi<any>(`/properties/${id}`),

  // Contracts info
  getContractAddresses: () => fetchApi<any>('/contracts'),
  getABIs: () => fetchApi<any>('/contracts/abis'),

  // Health
  getHealth: () => fetchApi<any>('/health'),
};
