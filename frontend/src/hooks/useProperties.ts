'use client';

import { usePropertyContext } from '@/context/PropertyContext';
import { Property } from '@/types';

export function useProperties() {
  const { state, dispatch, filteredProperties, totalPages, paginatedProperties } =
    usePropertyContext();

  const getPropertyById = (id: string): Property | undefined => {
    return state.properties.find((p) => p.id === id);
  };

  const getCities = (): string[] => {
    return [...new Set(state.properties.map((p) => p.city))].sort();
  };

  return {
    properties: state.properties,
    filteredProperties,
    paginatedProperties,
    totalPages,
    currentPage: state.currentPage,
    filters: state.filters,
    loading: state.loading,
    setFilters: (filters: Partial<typeof state.filters>) =>
      dispatch({ type: 'SET_FILTERS', payload: filters }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
    setPage: (page: number) => dispatch({ type: 'SET_PAGE', payload: page }),
    getPropertyById,
    getCities,
  };
}
