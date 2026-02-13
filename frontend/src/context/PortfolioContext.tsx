'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TokenHolding, PortfolioStats, Property } from '@/types';

interface PortfolioState {
  holdings: TokenHolding[];
  loading: boolean;
}

type PortfolioAction =
  | { type: 'ADD_HOLDING'; payload: { propertyId: string; tokens: number; pricePerToken: number; property?: Property } }
  | { type: 'REMOVE_HOLDING'; payload: { propertyId: string; tokens: number } }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: PortfolioState = {
  holdings: [],
  loading: false,
};

function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'ADD_HOLDING': {
      const existing = state.holdings.find((h) => h.propertyId === action.payload.propertyId);
      if (existing) {
        const newTokens = existing.tokens + action.payload.tokens;
        const newTotalInvested =
          existing.totalInvested + action.payload.tokens * action.payload.pricePerToken;
        const avgPurchasePrice = newTotalInvested / newTokens;
        return {
          ...state,
          holdings: state.holdings.map((h) =>
            h.propertyId === action.payload.propertyId
              ? {
                  ...h,
                  tokens: newTokens,
                  purchasePrice: avgPurchasePrice,
                  totalInvested: newTotalInvested,
                  unrealizedGain: newTokens * h.currentValue - newTotalInvested,
                  unrealizedGainPercent:
                    newTotalInvested > 0
                      ? ((newTokens * h.currentValue - newTotalInvested) / newTotalInvested) * 100
                      : 0,
                }
              : h
          ),
        };
      }
      // Create a minimal property object if not provided
      const property: Property = action.payload.property || {
        id: action.payload.propertyId,
        title: action.payload.propertyId,
        description: '',
        address: '',
        city: '',
        zipCode: '',
        country: 'France',
        type: 'apartment',
        price: 0,
        surface: 0,
        rooms: 0,
        bedrooms: 0,
        yearBuilt: 2000,
        images: [],
        tokenInfo: {
          totalTokens: 0,
          availableTokens: 0,
          tokenPrice: action.payload.pricePerToken,
          tokenSymbol: '',
          blockchain: 'Ethereum Sepolia',
        },
        financials: {
          annualRent: 0,
          annualCharges: 0,
          netYield: 0,
          grossYield: 0,
          monthlyRent: 0,
          occupancyRate: 0,
        },
        status: 'available',
        owner: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newHolding: TokenHolding = {
        id: `holding-${Date.now()}`,
        propertyId: action.payload.propertyId,
        property,
        tokens: action.payload.tokens,
        purchasePrice: action.payload.pricePerToken,
        currentValue: action.payload.pricePerToken,
        totalInvested: action.payload.tokens * action.payload.pricePerToken,
        unrealizedGain: 0,
        unrealizedGainPercent: 0,
        purchaseDate: new Date().toISOString(),
      };
      return { ...state, holdings: [...state.holdings, newHolding] };
    }
    case 'REMOVE_HOLDING': {
      const holding = state.holdings.find((h) => h.propertyId === action.payload.propertyId);
      if (!holding) return state;
      if (action.payload.tokens >= holding.tokens) {
        return {
          ...state,
          holdings: state.holdings.filter((h) => h.propertyId !== action.payload.propertyId),
        };
      }
      const remainingTokens = holding.tokens - action.payload.tokens;
      const remainingInvested = remainingTokens * holding.purchasePrice;
      return {
        ...state,
        holdings: state.holdings.map((h) =>
          h.propertyId === action.payload.propertyId
            ? {
                ...h,
                tokens: remainingTokens,
                totalInvested: remainingInvested,
                unrealizedGain: remainingTokens * h.currentValue - remainingInvested,
                unrealizedGainPercent:
                  remainingInvested > 0
                    ? ((remainingTokens * h.currentValue - remainingInvested) / remainingInvested) * 100
                    : 0,
              }
            : h
        ),
      };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface PortfolioContextType {
  state: PortfolioState;
  dispatch: React.Dispatch<PortfolioAction>;
  stats: PortfolioStats;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

function calculateStats(holdings: TokenHolding[]): PortfolioStats {
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
  const currentValue = holdings.reduce((sum, h) => sum + h.tokens * h.currentValue, 0);
  const totalGain = currentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const totalTokens = holdings.reduce((sum, h) => sum + h.tokens, 0);

  const yields = holdings
    .filter((h) => h.property.financials.netYield > 0)
    .map((h) => h.property.financials.netYield);
  const averageYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;

  const monthlyIncome = holdings.reduce((sum, h) => {
    if (h.property.tokenInfo.totalTokens === 0) return sum;
    const tokenShare = h.tokens / h.property.tokenInfo.totalTokens;
    return sum + h.property.financials.monthlyRent * tokenShare;
  }, 0);

  return {
    totalInvested,
    currentValue,
    totalGain,
    totalGainPercent,
    totalProperties: holdings.length,
    totalTokens,
    averageYield,
    monthlyIncome,
  };
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);
  const stats = calculateStats(state.holdings);

  return (
    <PortfolioContext.Provider value={{ state, dispatch, stats }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within PortfolioProvider');
  }
  return context;
}
