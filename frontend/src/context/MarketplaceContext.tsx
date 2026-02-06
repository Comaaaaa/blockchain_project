'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MarketplaceListing } from '@/types';
import { listings as mockListings } from '@/data/marketplace';

interface MarketplaceState {
  listings: MarketplaceListing[];
  loading: boolean;
}

type MarketplaceAction =
  | { type: 'ADD_LISTING'; payload: MarketplaceListing }
  | { type: 'UPDATE_LISTING'; payload: { id: string; updates: Partial<MarketplaceListing> } }
  | { type: 'REMOVE_LISTING'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: MarketplaceState = {
  listings: mockListings,
  loading: false,
};

function marketplaceReducer(
  state: MarketplaceState,
  action: MarketplaceAction
): MarketplaceState {
  switch (action.type) {
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
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);
  const activeListings = state.listings.filter((l) => l.status === 'active');

  return (
    <MarketplaceContext.Provider value={{ state, dispatch, activeListings }}>
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
