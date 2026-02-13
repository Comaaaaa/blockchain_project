'use client';

import Link from 'next/link';
import { NFT } from '@/types';
import { getAssetTypeLabel, formatValuationFromWei, shortenAddress } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface NFTCardProps {
  nft: NFT;
}

function getAssetTypeBadgeVariant(assetType: string): 'success' | 'info' | 'warning' | 'default' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    property_deed: 'success',
    artwork: 'info',
    collectible: 'warning',
  };
  return map[assetType] || 'default';
}

export default function NFTCard({ nft }: NFTCardProps) {
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
