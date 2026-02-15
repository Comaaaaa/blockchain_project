'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MarketplaceListing } from '@/types';
import { formatETH, shortenAddress } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ListingCardProps {
  listing: MarketplaceListing;
  onBuy?: (listing: MarketplaceListing) => void;
  onCancel?: (listing: MarketplaceListing) => void;
  isOwner?: boolean;
}

export default function ListingCard({ listing, onBuy, onCancel, isOwner }: ListingCardProps) {
  const initialPrice = listing.property.tokenInfo.tokenPrice;
  const priceDiff = initialPrice > 0 ? listing.pricePerToken - initialPrice : 0;
  const priceDiffPercent = initialPrice > 0 ? (priceDiff / initialPrice) * 100 : 0;
  const hasImage = listing.property.images.length > 0;

  const statusVariant = listing.status === 'active' ? 'success' : listing.status === 'sold' ? 'default' : 'default';
  const statusLabel = listing.status === 'active' ? 'Actif' : listing.status === 'sold' ? 'Vendu' : 'Annule';

  return (
    <Card hover className="p-4">
      <div className="flex gap-4">
        <Link href={`/properties/${listing.propertyId}`} className="shrink-0">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
            {hasImage ? (
              <Image
                src={listing.property.images[0]}
                alt={listing.property.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                No img
              </div>
            )}
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
                {listing.property.city && `${listing.property.city} · `}
                {listing.property.tokenInfo.tokenSymbol && (
                  <span className="font-medium">{listing.property.tokenInfo.tokenSymbol}</span>
                )}
                {' · '}Vendeur: {shortenAddress(listing.sellerAddress)}
              </p>
            </div>
            <Badge variant={statusVariant}>
              {statusLabel}
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
                <p className="font-semibold text-orange">{formatETH(listing.pricePerToken)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-semibold">{formatETH(listing.totalPrice)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {listing.status === 'active' && isOwner && onCancel && (
                <Button size="sm" variant="outline" onClick={() => onCancel(listing)}>
                  Annuler
                </Button>
              )}
              {listing.status === 'active' && !isOwner && onBuy && (
                <Button size="sm" onClick={() => onBuy(listing)}>
                  Acheter
                </Button>
              )}
            </div>
          </div>

          {initialPrice > 0 && listing.status === 'active' && (
            <p className={`text-xs mt-1 ${priceDiff >= 0 ? 'text-red-500' : 'text-green-600'}`}>
              {priceDiff >= 0 ? '+' : ''}{priceDiffPercent.toFixed(1)}% vs prix initial
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
