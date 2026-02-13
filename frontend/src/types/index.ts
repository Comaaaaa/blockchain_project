export interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  type: PropertyType;
  price: number;
  surface: number;
  rooms: number;
  bedrooms: number;
  floor?: number;
  totalFloors?: number;
  yearBuilt: number;
  images: string[];
  tokenInfo: TokenInfo;
  financials: PropertyFinancials;
  status: PropertyStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land';

export type PropertyStatus = 'available' | 'funding' | 'funded' | 'rented';

export interface TokenInfo {
  totalTokens: number;
  availableTokens: number;
  tokenPrice: number;
  tokenSymbol: string;
  contractAddress?: string;
  blockchain: string;
}

export interface PropertyFinancials {
  annualRent: number;
  annualCharges: number;
  netYield: number;
  grossYield: number;
  monthlyRent: number;
  occupancyRate: number;
}

export interface TokenHolding {
  id: string;
  propertyId: string;
  property: Property;
  tokens: number;
  purchasePrice: number;
  currentValue: number;
  totalInvested: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  purchaseDate: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  propertyId: string;
  propertyTitle: string;
  from: string;
  to: string;
  tokens: number;
  pricePerToken: number;
  totalAmount: number;
  txHash: string;
  status: TransactionStatus;
  createdAt: string;
  blockNumber?: number;
  gasUsed?: string;
}

export type TransactionType = 'purchase' | 'sale' | 'transfer' | 'swap' | 'dividend';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerAddress: string;
  propertyId: string;
  property: Property;
  tokensForSale: number;
  pricePerToken: number;
  totalPrice: number;
  status: ListingStatus;
  createdAt: string;
  expiresAt?: string;
}

export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  walletAddress?: string;
  avatar?: string;
  createdAt: string;
}

export interface PropertyFilters {
  city: string;
  type: PropertyType | '';
  minPrice: number;
  maxPrice: number;
  minSurface: number;
  maxSurface: number;
  minYield: number;
  maxYield: number;
  status: PropertyStatus | '';
  sortBy: SortOption;
  search: string;
}

export type SortOption = 'price-asc' | 'price-desc' | 'yield-desc' | 'yield-asc' | 'newest' | 'surface-desc';

export interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  totalGain: number;
  totalGainPercent: number;
  totalProperties: number;
  totalTokens: number;
  averageYield: number;
  monthlyIncome: number;
}

export interface PlatformStats {
  totalProperties: number;
  totalInvestors: number;
  totalTokenized: number;
  averageYield: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export type NFTAssetType = 'property_deed' | 'artwork' | 'collectible';

export interface NFT {
  tokenId: number;
  ownerAddress: string;
  assetType: NFTAssetType;
  location: string;
  valuationWei: string;
  tokenUri: string;
  createdAt: string;
}
