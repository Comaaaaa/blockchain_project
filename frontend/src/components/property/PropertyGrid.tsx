import { Property } from '@/types';
import PropertyCard from './PropertyCard';

interface PropertyGridProps {
  properties: Property[];
}

export default function PropertyGrid({ properties }: PropertyGridProps) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">Aucun bien ne correspond a vos criteres.</p>
        <p className="text-gray-400 mt-2">Essayez de modifier vos filtres.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
