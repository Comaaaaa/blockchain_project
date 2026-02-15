'use client';

import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { TokenHolding, PortfolioStats, Property } from '@/types';
import { api } from '@/lib/api';
import { getCurrentETHPriceEUR, weiToEUR } from '@/hooks/useETHPrice';

interface PortfolioState {
  holdings: TokenHolding[];
  loading: boolean;
}

type PortfolioAction =
  | { type: 'ADD_HOLDING'; payload: { propertyId: string; tokens: number; pricePerToken: number; property?: Property } }
  | { type: 'REMOVE_HOLDING'; payload: { propertyId: string; tokens: number } }
  | { type: 'SET_HOLDINGS'; payload: TokenHolding[] }
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
    case 'SET_HOLDINGS':
      return { ...state, holdings: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
  }
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function mapApiPropertyToProperty(p: Record<string, unknown>, ethPrice: number): Property {
  const tokenPriceWei = p.token_price_wei ? BigInt(p.token_price_wei) : BigInt(0);

  return {
    id: p.id,
    title: p.title || p.id,
    description: p.description || '',
    address: p.address || '',
    city: p.city || '',
    zipCode: p.zip_code || '',
    country: 'France',
    type: p.type || 'apartment',
    price: p.price || 0,
    surface: p.surface || 0,
    rooms: p.rooms || 0,
    bedrooms: p.bedrooms || 0,
    yearBuilt: p.year_built || 2000,
    images: parseImages(p.images),
    tokenInfo: {
      totalTokens: p.total_tokens || 0,
      availableTokens: (p.total_tokens || 0) - (p.tokens_sold || 0),
      tokenPrice: tokenPriceWei > BigInt(0) ? weiToEUR(tokenPriceWei, ethPrice) : 0,
      tokenPriceWei: tokenPriceWei.toString(),
      tokenSymbol: p.token_symbol || '',
      contractAddress: p.token_address || undefined,
      blockchain: 'Ethereum Sepolia',
    },
    financials: {
      annualRent: p.annual_rent || 0,
      annualCharges: p.annual_charges || 0,
      netYield: p.net_yield || 0,
      grossYield: p.gross_yield || 0,
      monthlyRent: (p.annual_rent || 0) / 12,
      occupancyRate: p.occupancy_rate || 95,
    },
    status: p.status || 'available',
    owner: 'TokenImmo',
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.updated_at || new Date().toISOString(),
  };
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

  useEffect(() => {
    const fetchPortfolioFromTransactions = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const [transactions, properties] = await Promise.all([
          api.getTransactions(),
          api.getProperties(),
        ]);

        const ethPrice = getCurrentETHPriceEUR();
        const propertiesById = new Map<string, Property>();
        for (const p of properties) {
          const mapped = mapApiPropertyToProperty(p, ethPrice);
          propertiesById.set(mapped.id, mapped);
        }

        const aggregate = new Map<string, {
          tokens: number;
          totalInvestedEUR: number;
          purchaseDate: string;
          isNft: boolean;
          label?: string;
        }>();

        for (const tx of transactions) {
          if (tx.status && tx.status !== 'confirmed') continue;
          if (tx.type !== 'purchase' && tx.type !== 'listing_sold' && tx.type !== 'swap') continue;

          const isNftPurchase =
            String(tx.from_address || '').toLowerCase() === 'nft_marketplace'
            && tx.type === 'listing_sold';
          const isSwap = tx.type === 'swap';
          const rawSwapDirection = String(tx.swap_direction || tx.direction || '').toLowerCase();
          const swapTitle = String(tx.property_title || '');

          const baseTokens = Number(tx.tokens || (isNftPurchase ? 1 : 0));
          const inferredSwapDirection: 'eth_to_token' | 'token_to_eth' | undefined =
            rawSwapDirection === 'eth_to_token' || rawSwapDirection === 'token_to_eth'
              ? (rawSwapDirection as 'eth_to_token' | 'token_to_eth')
              : baseTokens < 0
                ? 'token_to_eth'
                : baseTokens > 0
                  ? 'eth_to_token'
                  : swapTitle.includes('PAR7E → ETH')
                    ? 'token_to_eth'
                    : swapTitle.includes('ETH → PAR7E')
                      ? 'eth_to_token'
                      : undefined;
          const isSwapSell = isSwap && inferredSwapDirection === 'token_to_eth';
          const tokens = isSwap
            ? (isSwapSell ? -Math.abs(baseTokens) : Math.abs(baseTokens))
            : baseTokens;
          if (tokens === 0 || (!isSwap && tokens < 0)) continue;

          const propertyId = isNftPurchase
            ? `nft-${String(tx.tx_hash || tx.id || Date.now())}`
            : isSwap
              ? String(tx.property_id || 'prop-001')
              : String(tx.property_id || '');
          if (!propertyId) continue;

          const existing = aggregate.get(propertyId) || {
            tokens: 0,
            totalInvestedEUR: 0,
            purchaseDate: String(tx.created_at || new Date().toISOString()),
            isNft: isNftPurchase,
            label: isNftPurchase
              ? (tx.property_title || 'NFT TokenImmo (Marketplace)')
              : isSwap
                ? 'PAR7E'
                : undefined,
          };

          const investedEUR = tx.total_amount_wei
            ? weiToEUR(BigInt(tx.total_amount_wei), ethPrice)
            : 0;

          aggregate.set(propertyId, {
            tokens: existing.tokens + tokens,
            totalInvestedEUR: existing.totalInvestedEUR + (isSwapSell ? -investedEUR : investedEUR),
            purchaseDate:
              new Date(tx.created_at || 0).getTime() > new Date(existing.purchaseDate).getTime()
                ? existing.purchaseDate
                : (tx.created_at || existing.purchaseDate),
            isNft: existing.isNft,
            label: existing.label,
          });
        }

        const holdings: TokenHolding[] = [];
        for (const [propertyId, summary] of aggregate.entries()) {
          if (summary.tokens <= 0) continue;

          const isNftHolding = summary.isNft;

          const property = (isNftHolding ? undefined : propertiesById.get(propertyId)) || {
            id: propertyId,
            title: summary.label || propertyId,
            description: '',
            address: '',
            city: isNftHolding ? 'NFT Marketplace' : '',
            zipCode: '',
            country: 'France',
            type: 'apartment' as const,
            price: 0,
            surface: 0,
            rooms: 0,
            bedrooms: 0,
            yearBuilt: 2000,
            images: [],
            tokenInfo: {
              totalTokens: 0,
              availableTokens: 0,
              tokenPrice: 0,
              tokenPriceWei: '0',
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
            status: 'available' as const,
            owner: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const purchasePrice = summary.tokens > 0 ? summary.totalInvestedEUR / summary.tokens : 0;
          const currentValue = property.tokenInfo.tokenPrice > 0 ? property.tokenInfo.tokenPrice : purchasePrice;
          const currentTotal = summary.tokens * currentValue;
          const gain = currentTotal - summary.totalInvestedEUR;

          holdings.push({
            id: `holding-${propertyId}`,
            propertyId,
            property,
            tokens: summary.tokens,
            purchasePrice,
            currentValue,
            totalInvested: summary.totalInvestedEUR,
            unrealizedGain: gain,
            unrealizedGainPercent: summary.totalInvestedEUR > 0 ? (gain / summary.totalInvestedEUR) * 100 : 0,
            purchaseDate: summary.purchaseDate,
          });
        }

        dispatch({ type: 'SET_HOLDINGS', payload: holdings });
      } catch (error) {
        console.error('Failed to hydrate portfolio:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchPortfolioFromTransactions();
    const interval = setInterval(fetchPortfolioFromTransactions, 60000);
    return () => clearInterval(interval);
  }, []);

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
