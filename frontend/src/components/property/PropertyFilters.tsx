'use client';

import { usePropertyContext } from '@/context/PropertyContext';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const cityOptions = [
  { value: '', label: 'Toutes les villes' },
  { value: 'Paris', label: 'Paris' },
  { value: 'Lyon', label: 'Lyon' },
  { value: 'Nice', label: 'Nice' },
  { value: 'Bordeaux', label: 'Bordeaux' },
  { value: 'Toulouse', label: 'Toulouse' },
  { value: 'Marseille', label: 'Marseille' },
  { value: 'Strasbourg', label: 'Strasbourg' },
  { value: 'Lille', label: 'Lille' },
  { value: 'Nantes', label: 'Nantes' },
  { value: 'Montpellier', label: 'Montpellier' },
  { value: 'Rennes', label: 'Rennes' },
  { value: 'Annecy', label: 'Annecy' },
  { value: 'Aix-en-Provence', label: 'Aix-en-Provence' },
];

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'apartment', label: 'Appartement' },
  { value: 'house', label: 'Maison' },
  { value: 'commercial', label: 'Local commercial' },
  { value: 'land', label: 'Terrain' },
];

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'available', label: 'Disponible' },
  { value: 'funding', label: 'En financement' },
  { value: 'funded', label: 'Finance' },
];

const sortOptions = [
  { value: 'newest', label: 'Plus recents' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix decroissant' },
  { value: 'yield-desc', label: 'Rendement decroissant' },
  { value: 'yield-asc', label: 'Rendement croissant' },
  { value: 'surface-desc', label: 'Surface decroissante' },
];

export default function PropertyFilters() {
  const { state, dispatch, filteredProperties } = usePropertyContext();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      {/* Search + basic filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un bien..."
            value={state.filters.search}
            onChange={(e) => dispatch({ type: 'SET_FILTERS', payload: { search: e.target.value } })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
          />
        </div>
        <Select
          options={cityOptions}
          value={state.filters.city}
          onChange={(e) => dispatch({ type: 'SET_FILTERS', payload: { city: e.target.value } })}
          className="md:w-48"
        />
        <Select
          options={typeOptions}
          value={state.filters.type}
          onChange={(e) =>
            dispatch({ type: 'SET_FILTERS', payload: { type: e.target.value as '' } })
          }
          className="md:w-48"
        />
        <Select
          options={sortOptions}
          value={state.filters.sortBy}
          onChange={(e) =>
            dispatch({ type: 'SET_FILTERS', payload: { sortBy: e.target.value as 'newest' } })
          }
          className="md:w-48"
        />
      </div>

      {/* Toggle advanced */}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-gray-500 hover:text-orange transition-colors"
        >
          <FunnelIcon className="h-4 w-4 mr-1" />
          Filtres avances
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filteredProperties.length} bien{filteredProperties.length > 1 ? 's' : ''} trouve
            {filteredProperties.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => dispatch({ type: 'RESET_FILTERS' })}
            className="text-sm text-orange hover:text-orange-dark transition-colors"
          >
            Reinitialiser
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Statut"
            options={statusOptions}
            value={state.filters.status}
            onChange={(e) =>
              dispatch({ type: 'SET_FILTERS', payload: { status: e.target.value as '' } })
            }
          />
          <Input
            label="Surface min (m2)"
            type="number"
            placeholder="0"
            value={state.filters.minSurface || ''}
            onChange={(e) =>
              dispatch({
                type: 'SET_FILTERS',
                payload: { minSurface: Number(e.target.value) || 0 },
              })
            }
          />
          <Input
            label="Rendement min (%)"
            type="number"
            step="0.1"
            placeholder="0"
            value={state.filters.minYield || ''}
            onChange={(e) =>
              dispatch({
                type: 'SET_FILTERS',
                payload: { minYield: Number(e.target.value) || 0 },
              })
            }
          />
          <Input
            label="Prix max (EUR)"
            type="number"
            placeholder="0"
            value={state.filters.maxPrice || ''}
            onChange={(e) =>
              dispatch({
                type: 'SET_FILTERS',
                payload: { maxPrice: Number(e.target.value) || 0 },
              })
            }
          />
        </div>
      )}
    </div>
  );
}
