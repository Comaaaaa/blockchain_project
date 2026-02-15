'use client';

import Link from 'next/link';
import { NFT, NFTListing } from '@/types';
import { getAssetTypeLabel, formatValuationFromWei, shortenAddress } from '@/lib/utils';
import { useETHPrice, formatWeiAsEUR } from '@/hooks/useETHPrice';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MapPinIcon, HomeIcon, TagIcon } from '@heroicons/react/24/outline';
import { formatEther } from 'viem';

interface NFTCardProps {
  nft: NFT;
  listing?: NFTListing;
}

function getAssetTypeBadgeVariant(assetType: string): 'success' | 'info' | 'warning' | 'default' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    property_deed: 'success',
    artwork: 'info',
    collectible: 'warning',
  };
  return map[assetType] || 'default';
}

export default function NFTCard({ nft, listing }: NFTCardProps) {
  const { ethPrice } = useETHPrice();

  return (
    <Link href={`/nfts/${nft.tokenId}`}>
      <Card hover className="h-full flex flex-col p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-orange">TIMMO #{nft.tokenId}</h3>
          <Badge variant={getAssetTypeBadgeVariant(nft.assetType)}>
            {getAssetTypeLabel(nft.assetType)}
          </Badge>
        </div>

        {/* Listing badge */}
        {listing && (
          <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-full bg-orange-50 border border-orange-300 text-orange-700 text-xs w-fit">
            <TagIcon className="h-3.5 w-3.5" />
            <span>En vente — {formatEther(BigInt(listing.priceWei))} ETH (~{formatWeiAsEUR(listing.priceWei, ethPrice)})</span>
          </div>
        )}

        {/* Property badge */}
        {nft.propertyId && (
          <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs w-fit">
            <HomeIcon className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{nft.propertyTitle || nft.propertyId}</span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPinIcon className="h-4 w-4 mr-1 shrink-0" />
          <span className="line-clamp-1">{nft.location}</span>
        </div>

        {/* Valuation */}
        <div className="mb-3">
          <p className="text-sm text-gray-500">Valorisation</p>
          <p className="text-xl font-bold text-gray-900">
            {formatValuationFromWei(nft.valuationWei)}
          </p>
          <p className="text-xs text-gray-400">~{formatWeiAsEUR(nft.valuationWei, ethPrice)}</p>
        </div>

        {/* Owner */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Proprietaire</span>
            <span className="font-mono">{shortenAddress(nft.ownerAddress)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
