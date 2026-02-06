'use client';

import { usePortfolioContext } from '@/context/PortfolioContext';

export function usePortfolio() {
  const { state, dispatch, stats } = usePortfolioContext();

  const getHoldingByPropertyId = (propertyId: string) => {
    return state.holdings.find((h) => h.propertyId === propertyId);
  };

  const hasTokens = (propertyId: string): boolean => {
    return state.holdings.some((h) => h.propertyId === propertyId && h.tokens > 0);
  };

  return {
    holdings: state.holdings,
    stats,
    loading: state.loading,
    getHoldingByPropertyId,
    hasTokens,
    addHolding: (propertyId: string, tokens: number, pricePerToken: number) =>
      dispatch({ type: 'ADD_HOLDING', payload: { propertyId, tokens, pricePerToken } }),
    removeHolding: (propertyId: string, tokens: number) =>
      dispatch({ type: 'REMOVE_HOLDING', payload: { propertyId, tokens } }),
  };
}
