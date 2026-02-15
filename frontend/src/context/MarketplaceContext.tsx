'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { MarketplaceListing } from '@/types';
import { api } from '@/lib/api';
import { formatEther } from 'viem';

interface MarketplaceState {
  listings: MarketplaceListing[];
  loading: boolean;
}

type MarketplaceAction =
  | { type: 'SET_LISTINGS'; payload: MarketplaceListing[] }
  | { type: 'ADD_LISTING'; payload: MarketplaceListing }
  | { type: 'UPDATE_LISTING'; payload: { id: string; updates: Partial<MarketplaceListing> } }
  | { type: 'REMOVE_LISTING'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: MarketplaceState = {
  listings: [],
  loading: true,
};

function marketplaceReducer(
  state: MarketplaceState,
  action: MarketplaceAction
): MarketplaceState {
  switch (action.type) {
    case 'SET_LISTINGS':
      return { ...state, listings: action.payload, loading: false };
    case 'ADD_LISTING':
      return { ...state, listings: [action.payload, ...state.listings] };
    case 'UPDATE_LISTING':
      return {
        ...state,
        listings: state.listings.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload.updates } : l
        ),
      };
    case 'REMOVE_LISTING':
      return {
        ...state,
        listings: state.listings.filter((l) => l.id !== action.payload),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface MarketplaceContextType {
  state: MarketplaceState;
  dispatch: React.Dispatch<MarketplaceAction>;
  activeListings: MarketplaceListing[];
  refetch: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

function parseImages(imagesStr: string | null): string[] {
  if (!imagesStr) return [];
  try {
    const parsed = JSON.parse(imagesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapApiListing(l: any): MarketplaceListing {
  const images = parseImages(l.property_images);
  const tokenPriceWei = l.token_price_wei ? BigInt(l.token_price_wei) : BigInt(0);
  const pricePerTokenWei = l.price_per_token_wei ? BigInt(l.price_per_token_wei) : BigInt(0);
  const amount = Number(l.amount || 0);
  const totalPriceWei = (pricePerTokenWei * BigInt(amount)).toString();

  const rawStatus = typeof l.listing_status === 'string' ? l.listing_status.toLowerCase() : '';
  const status =
    rawStatus === 'cancelled'
      ? 'cancelled'
      : rawStatus === 'sold'
        ? 'sold'
        : l.active
          ? 'active'
          : 'sold';

  return {
    id: String(l.listing_id_onchain ?? l.id),
    sellerId: l.seller_address || '',
    sellerAddress: l.seller_address || '',
    propertyId: l.property_id || l.prop_id || '',
    property: {
      id: l.property_id || l.prop_id || '',
      title: l.property_title || 'Propriete',
      description: '',
      address: '',
      city: l.city || '',
      zipCode: '',
      country: 'France',
      type: l.property_type || 'apartment',
      price: l.property_price || 0,
      surface: l.surface || 0,
      rooms: 0,
      bedrooms: 0,
      yearBuilt: 2000,
      images,
      tokenInfo: {
        totalTokens: l.total_tokens || 0,
        availableTokens: (l.total_tokens || 0) - (l.tokens_sold || 0),
        tokenPrice: Number(formatEther(tokenPriceWei)),
        tokenPriceWei: tokenPriceWei.toString(),
        tokenSymbol: l.token_symbol || '',
        blockchain: 'Ethereum Sepolia',
      },
      financials: {
        annualRent: 0,
        annualCharges: 0,
        netYield: l.net_yield || 0,
        grossYield: 0,
        monthlyRent: 0,
        occupancyRate: 0,
      },
      status: 'available',
      owner: '',
      createdAt: '',
      updatedAt: '',
    },
    tokensForSale: amount,
    pricePerToken: Number(formatEther(pricePerTokenWei)),
    totalPrice: Number(formatEther(BigInt(totalPriceWei))),
    pricePerTokenWei: pricePerTokenWei.toString(),
    totalPriceWei,
    status,
    createdAt: l.created_at || new Date().toISOString(),
  };
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);

  const fetchListings = async () => {
    try {
      const data = await api.getAllListings();
      dispatch({ type: 'SET_LISTINGS', payload: data.map(mapApiListing) });
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeListings = state.listings.filter((l) => l.status === 'active');

  return (
    <MarketplaceContext.Provider value={{ state, dispatch, activeListings, refetch: fetchListings }}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplaceContext() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplaceContext must be used within MarketplaceProvider');
  }
  return context;
}
