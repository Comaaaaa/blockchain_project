'use client';

import { usePropertyContext } from '@/context/PropertyContext';
import { PropertyFilters, SortOption, PropertyType, PropertyStatus } from '@/types';

export function usePropertyFilters() {
  const { state, dispatch, filteredProperties } = usePropertyContext();

  return {
    filters: state.filters,
    resultCount: filteredProperties.length,

    setSearch: (search: string) => dispatch({ type: 'SET_FILTERS', payload: { search } }),
    setCity: (city: string) => dispatch({ type: 'SET_FILTERS', payload: { city } }),
    setType: (type: PropertyType | '') => dispatch({ type: 'SET_FILTERS', payload: { type } }),
    setStatus: (status: PropertyStatus | '') =>
      dispatch({ type: 'SET_FILTERS', payload: { status } }),
    setSortBy: (sortBy: SortOption) => dispatch({ type: 'SET_FILTERS', payload: { sortBy } }),
    setMinPrice: (minPrice: number) => dispatch({ type: 'SET_FILTERS', payload: { minPrice } }),
    setMaxPrice: (maxPrice: number) => dispatch({ type: 'SET_FILTERS', payload: { maxPrice } }),
    setMinSurface: (minSurface: number) =>
      dispatch({ type: 'SET_FILTERS', payload: { minSurface } }),
    setMaxSurface: (maxSurface: number) =>
      dispatch({ type: 'SET_FILTERS', payload: { maxSurface } }),
    setMinYield: (minYield: number) => dispatch({ type: 'SET_FILTERS', payload: { minYield } }),
    setMaxYield: (maxYield: number) => dispatch({ type: 'SET_FILTERS', payload: { maxYield } }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
  };
}
