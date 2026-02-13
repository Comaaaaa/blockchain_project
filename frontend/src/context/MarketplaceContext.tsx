'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { MarketplaceListing } from '@/types';
import { api } from '@/lib/api';

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

function mapApiListing(l: any): MarketplaceListing {
  return {
    id: String(l.listing_id_onchain ?? l.id),
    sellerId: l.seller_address || '',
    sellerAddress: l.seller_address || '',
    propertyId: l.property_id || '',
    property: {
      id: l.property_id || '',
      title: l.property_title || 'Propriete',
      description: '',
      address: '',
      city: l.city || '',
      zipCode: '',
      country: 'France',
      type: l.property_type || 'apartment',
      price: 0,
      surface: 0,
      rooms: 0,
      bedrooms: 0,
      yearBuilt: 2000,
      images: [],
      tokenInfo: { totalTokens: 0, availableTokens: 0, tokenPrice: 0, tokenSymbol: '', blockchain: 'Ethereum Sepolia' },
      financials: { annualRent: 0, annualCharges: 0, netYield: 0, grossYield: 0, monthlyRent: 0, occupancyRate: 0 },
      status: 'available',
      owner: '',
      createdAt: '',
      updatedAt: '',
    },
    tokensForSale: l.amount || 0,
    pricePerToken: parseFloat(l.price_per_token_wei) || 0,
    totalPrice: (l.amount || 0) * (parseFloat(l.price_per_token_wei) || 0),
    status: l.active ? 'active' : 'sold',
    createdAt: l.created_at || new Date().toISOString(),
  };
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);

  const fetchListings = async () => {
    try {
      const data = await api.getActiveListings();
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
