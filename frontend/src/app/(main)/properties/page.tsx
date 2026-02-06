'use client';

import PageContainer from '@/components/layout/PageContainer';
import PropertyGrid from '@/components/property/PropertyGrid';
import PropertyFilters from '@/components/property/PropertyFilters';
import Pagination from '@/components/ui/Pagination';
import { usePropertyContext } from '@/context/PropertyContext';

export default function PropertiesPage() {
  const { paginatedProperties, totalPages, state, dispatch } = usePropertyContext();

  return (
    <PageContainer
      title="Biens immobiliers"
      subtitle="Decouvrez notre selection de biens tokenises et investissez dans l'immobilier francais"
    >
      <PropertyFilters />
      <PropertyGrid properties={paginatedProperties} />
      <div className="mt-8">
        <Pagination
          currentPage={state.currentPage}
          totalPages={totalPages}
          onPageChange={(page) => dispatch({ type: 'SET_PAGE', payload: page })}
        />
      </div>
    </PageContainer>
  );
}
