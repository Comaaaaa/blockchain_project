'use client';

import { MarketplaceListing } from '@/types';
import ListingCard from './ListingCard';

interface ListingGridProps {
  listings: MarketplaceListing[];
  onBuy?: (listing: MarketplaceListing) => void;
}

export default function ListingGrid({ listings, onBuy }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Aucune offre disponible sur le marketplace.</p>
        <p className="text-gray-400 mt-1">Revenez plus tard ou creez votre propre offre.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} onBuy={onBuy} />
      ))}
    </div>
  );
}
