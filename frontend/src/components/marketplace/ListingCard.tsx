'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MarketplaceListing } from '@/types';
import { formatCurrency, shortenAddress } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ListingCardProps {
  listing: MarketplaceListing;
  onBuy?: (listing: MarketplaceListing) => void;
}

export default function ListingCard({ listing, onBuy }: ListingCardProps) {
  const priceDiff = listing.pricePerToken - listing.property.tokenInfo.tokenPrice;
  const priceDiffPercent = (priceDiff / listing.property.tokenInfo.tokenPrice) * 100;

  return (
    <Card hover className="p-4">
      <div className="flex gap-4">
        <Link href={`/properties/${listing.propertyId}`} className="shrink-0">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden">
            <Image
              src={listing.property.images[0]}
              alt={listing.property.title}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/properties/${listing.propertyId}`}>
                <h3 className="font-semibold text-gray-900 hover:text-orange transition-colors text-sm truncate">
                  {listing.property.title}
                </h3>
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">
                Vendeur: {shortenAddress(listing.sellerAddress)}
              </p>
            </div>
            <Badge variant={listing.status === 'active' ? 'success' : 'default'}>
              {listing.status === 'active' ? 'Actif' : listing.status === 'sold' ? 'Vendu' : 'Annule'}
            </Badge>
          </div>

          <div className="mt-2 flex items-end justify-between">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Tokens</p>
                <p className="font-semibold">{listing.tokensForSale}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prix/token</p>
                <p className="font-semibold text-orange">{formatCurrency(listing.pricePerToken)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-semibold">{formatCurrency(listing.totalPrice)}</p>
              </div>
            </div>

            {listing.status === 'active' && onBuy && (
              <Button size="sm" onClick={() => onBuy(listing)}>
                Acheter
              </Button>
            )}
          </div>

          <p className={`text-xs mt-1 ${priceDiff >= 0 ? 'text-red-500' : 'text-green-600'}`}>
            {priceDiff >= 0 ? '+' : ''}{priceDiffPercent.toFixed(1)}% vs prix initial
          </p>
        </div>
      </div>
    </Card>
  );
}
