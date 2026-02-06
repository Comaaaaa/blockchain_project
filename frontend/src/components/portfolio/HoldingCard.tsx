'use client';

import Link from 'next/link';
import Image from 'next/image';
import { TokenHolding } from '@/types';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';

interface HoldingCardProps {
  holding: TokenHolding;
}

export default function HoldingCard({ holding }: HoldingCardProps) {
  const currentTotal = holding.tokens * holding.currentValue;
  const isPositive = holding.unrealizedGain >= 0;

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Image */}
        <Link href={`/properties/${holding.propertyId}`} className="shrink-0">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden">
            <Image
              src={holding.property.images[0]}
              alt={holding.property.title}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/properties/${holding.propertyId}`}>
            <h3 className="font-semibold text-gray-900 hover:text-orange transition-colors truncate">
              {holding.property.title}
            </h3>
          </Link>
          <p className="text-sm text-gray-500">{holding.property.city}</p>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Tokens</p>
              <p className="font-semibold">{holding.tokens}</p>
            </div>
            <div>
              <p className="text-gray-500">Investi</p>
              <p className="font-semibold">{formatCurrency(holding.totalInvested)}</p>
            </div>
            <div>
              <p className="text-gray-500">Valeur actuelle</p>
              <p className="font-semibold">{formatCurrency(currentTotal)}</p>
            </div>
            <div>
              <p className="text-gray-500">Plus-value</p>
              <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{formatCurrency(holding.unrealizedGain)} ({isPositive ? '+' : ''}{formatPercent(holding.unrealizedGainPercent)})
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Achat le {formatDate(holding.purchaseDate)} - Rendement: {holding.property.financials.netYield}%
          </p>
        </div>
      </div>
    </Card>
  );
}
