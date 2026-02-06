'use client';

import { TokenHolding } from '@/types';
import HoldingCard from './HoldingCard';

interface HoldingsListProps {
  holdings: TokenHolding[];
}

export default function HoldingsList({ holdings }: HoldingsListProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Vous ne possedez aucun token.</p>
        <p className="text-gray-400 mt-1">
          Parcourez les biens disponibles pour commencer a investir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {holdings.map((holding) => (
        <HoldingCard key={holding.id} holding={holding} />
      ))}
    </div>
  );
}
