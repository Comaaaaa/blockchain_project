'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Property, PropertyFilters } from '@/types';
import { properties as mockProperties } from '@/data/properties';

interface PropertyState {
  properties: Property[];
  filters: PropertyFilters;
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
}

type PropertyAction =
  | { type: 'SET_FILTERS'; payload: Partial<PropertyFilters> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_PROPERTY'; payload: Property }
  | { type: 'UPDATE_PROPERTY'; payload: { id: string; updates: Partial<Property> } };

const defaultFilters: PropertyFilters = {
  city: '',
  type: '',
  minPrice: 0,
  maxPrice: 0,
  minSurface: 0,
  maxSurface: 0,
  minYield: 0,
  maxYield: 0,
  status: '',
  sortBy: 'newest',
  search: '',
};

const initialState: PropertyState = {
  properties: mockProperties,
  filters: defaultFilters,
  loading: false,
  currentPage: 1,
  itemsPerPage: 9,
};

function propertyReducer(state: PropertyState, action: PropertyAction): PropertyState {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload }, currentPage: 1 };
    case 'RESET_FILTERS':
      return { ...state, filters: defaultFilters, currentPage: 1 };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_PROPERTY':
      return { ...state, properties: [action.payload, ...state.properties] };
    case 'UPDATE_PROPERTY':
      return {
        ...state,
        properties: state.properties.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    default:
      return state;
  }
}

interface PropertyContextType {
  state: PropertyState;
  dispatch: React.Dispatch<PropertyAction>;
  filteredProperties: Property[];
  totalPages: number;
  paginatedProperties: Property[];
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

function applyFilters(properties: Property[], filters: PropertyFilters): Property[] {
  let result = [...properties];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.city.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    );
  }

  if (filters.city) {
    result = result.filter((p) => p.city.toLowerCase() === filters.city.toLowerCase());
  }

  if (filters.type) {
    result = result.filter((p) => p.type === filters.type);
  }

  if (filters.status) {
    result = result.filter((p) => p.status === filters.status);
  }

  if (filters.minPrice > 0) {
    result = result.filter((p) => p.price >= filters.minPrice);
  }

  if (filters.maxPrice > 0) {
    result = result.filter((p) => p.price <= filters.maxPrice);
  }

  if (filters.minSurface > 0) {
    result = result.filter((p) => p.surface >= filters.minSurface);
  }

  if (filters.maxSurface > 0) {
    result = result.filter((p) => p.surface <= filters.maxSurface);
  }

  if (filters.minYield > 0) {
    result = result.filter((p) => p.financials.netYield >= filters.minYield);
  }

  if (filters.maxYield > 0) {
    result = result.filter((p) => p.financials.netYield <= filters.maxYield);
  }

  // Sorting
  switch (filters.sortBy) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'yield-desc':
      result.sort((a, b) => b.financials.netYield - a.financials.netYield);
      break;
    case 'yield-asc':
      result.sort((a, b) => a.financials.netYield - b.financials.netYield);
      break;
    case 'surface-desc':
      result.sort((a, b) => b.surface - a.surface);
      break;
    case 'newest':
    default:
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  return result;
}

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(propertyReducer, initialState);

  const filteredProperties = applyFilters(state.properties, state.filters);
  const totalPages = Math.ceil(filteredProperties.length / state.itemsPerPage);
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const paginatedProperties = filteredProperties.slice(start, start + state.itemsPerPage);

  return (
    <PropertyContext.Provider
      value={{ state, dispatch, filteredProperties, totalPages, paginatedProperties }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('usePropertyContext must be used within PropertyProvider');
  }
  return context;
}
