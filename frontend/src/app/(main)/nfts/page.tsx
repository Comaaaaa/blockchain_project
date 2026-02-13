'use client';

import { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import NFTGrid from '@/components/nft/NFTGrid';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { NFT } from '@/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default function NFTsPage() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNFTs();
      const mapped: NFT[] = data.map((item: any) => ({
        tokenId: item.token_id ?? item.tokenId,
        ownerAddress: item.owner_address ?? item.ownerAddress,
        assetType: item.asset_type ?? item.assetType,
        location: item.location,
        valuationWei: item.valuation_wei ?? item.valuationWei,
        tokenUri: item.token_uri ?? item.tokenUri,
        createdAt: item.created_at ?? item.createdAt,
      }));
      setNfts(mapped);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des NFTs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, []);

  return (
    <PageContainer
      title="Galerie NFT"
      subtitle="Explorez les NFTs TokenImmo (ERC-721 TIMMO)"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={fetchNFTs} disabled={loading}>
          <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <p className="text-gray-500">Chargement des NFTs...</p>
        </div>
      ) : (
        <NFTGrid nfts={nfts} />
      )}
    </PageContainer>
  );
}
