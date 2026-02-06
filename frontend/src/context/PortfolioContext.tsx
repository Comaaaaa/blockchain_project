'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TokenHolding, PortfolioStats } from '@/types';
import { properties } from '@/data/properties';

interface PortfolioState {
  holdings: TokenHolding[];
  loading: boolean;
}

type PortfolioAction =
  | { type: 'ADD_HOLDING'; payload: { propertyId: string; tokens: number; pricePerToken: number } }
  | { type: 'REMOVE_HOLDING'; payload: { propertyId: string; tokens: number } }
  | { type: 'SET_LOADING'; payload: boolean };

const initialHoldings: TokenHolding[] = [
  {
    id: 'holding-001',
    propertyId: 'prop-001',
    property: properties.find((p) => p.id === 'prop-001')!,
    tokens: 10,
    purchasePrice: 850,
    currentValue: 870,
    totalInvested: 8500,
    unrealizedGain: 200,
    unrealizedGainPercent: 2.35,
    purchaseDate: '2024-02-15T10:30:00Z',
  },
  {
    id: 'holding-002',
    propertyId: 'prop-002',
    property: properties.find((p) => p.id === 'prop-002')!,
    tokens: 15,
    purchasePrice: 520,
    currentValue: 535,
    totalInvested: 7800,
    unrealizedGain: 225,
    unrealizedGainPercent: 2.88,
    purchaseDate: '2024-02-20T14:15:00Z',
  },
  {
    id: 'holding-003',
    propertyId: 'prop-004',
    property: properties.find((p) => p.id === 'prop-004')!,
    tokens: 5,
    purchasePrice: 680,
    currentValue: 700,
    totalInvested: 3400,
    unrealizedGain: 100,
    unrealizedGainPercent: 2.94,
    purchaseDate: '2024-03-01T09:45:00Z',
  },
  {
    id: 'holding-004',
    propertyId: 'prop-006',
    property: properties.find((p) => p.id === 'prop-006')!,
    tokens: 15,
    purchasePrice: 633,
    currentValue: 650,
    totalInvested: 9495,
    unrealizedGain: 255,
    unrealizedGainPercent: 2.69,
    purchaseDate: '2024-03-18T11:00:00Z',
  },
];

const initialState: PortfolioState = {
  holdings: initialHoldings,
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
                    ((newTokens * h.currentValue - newTotalInvested) / newTotalInvested) * 100,
                }
              : h
          ),
        };
      }
      const property = properties.find((p) => p.id === action.payload.propertyId)!;
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
                  ((remainingTokens * h.currentValue - remainingInvested) / remainingInvested) * 100,
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

  const yields = holdings.map((h) => h.property.financials.netYield);
  const averageYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;

  const monthlyIncome = holdings.reduce((sum, h) => {
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
