'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { NFT } from '@/types';
import {
  getAssetTypeLabel,
  formatValuationFromWei,
  shortenAddress,
  formatDateTime,
} from '@/lib/utils';
import {
  ArrowLeftIcon,
  MapPinIcon,
  CubeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

export default function NFTDetailPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  const [nft, setNft] = useState<NFT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFT = async () => {
      try {
        const data = await api.getNFT(Number(tokenId));
        setNft({
          tokenId: data.tokenId ?? data.token_id,
          ownerAddress: data.owner ?? data.owner_address ?? data.ownerAddress,
          assetType: data.assetType ?? data.asset_type,
          location: data.location,
          valuationWei: data.valuationWei ?? data.valuation_wei,
          tokenUri: data.tokenURI ?? data.token_uri ?? data.tokenUri,
          createdAt: data.mintedAt ? new Date(data.mintedAt * 1000).toISOString() : (data.created_at ?? data.createdAt ?? new Date().toISOString()),
        });
      } catch (err: any) {
        setError(err.message || 'NFT introuvable');
      } finally {
        setLoading(false);
      }
    };
    fetchNFT();
  }, [tokenId]);

  if (loading) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !nft) {
    return (
      <PageContainer>
        <Link
          href="/nfts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-orange mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Retour aux NFTs
        </Link>
        <div className="text-center py-16">
          <p className="text-red-500 text-lg">{error || 'NFT introuvable'}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href="/nfts"
        className="inline-flex items-center text-sm text-gray-500 hover:text-orange mb-6 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Retour aux NFTs
      </Link>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          TIMMO #{nft.tokenId}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="success">{getAssetTypeLabel(nft.assetType)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Metadata */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CubeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Type d&apos;actif</p>
                  <p className="font-medium">{getAssetTypeLabel(nft.assetType)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Localisation</p>
                  <p className="font-medium">{nft.location}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valorisation</p>
                <p className="text-2xl font-bold text-orange">
                  {formatValuationFromWei(nft.valuationWei)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de mint</p>
                <p className="font-medium">{formatDateTime(nft.createdAt)}</p>
              </div>
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">Token URI</p>
                  <p className="font-mono text-sm text-gray-700 break-all">{nft.tokenUri}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Blockchain Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Blockchain</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Proprietaire</span>
                <span className="font-mono text-sm">{shortenAddress(nft.ownerAddress, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Adresse complete</span>
                <span className="font-mono text-xs text-gray-600 break-all text-right max-w-[60%]">
                  {nft.ownerAddress}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Standard</span>
                  <span className="font-medium">ERC-721</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Symbole</span>
                <span className="font-mono font-semibold text-orange">TIMMO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reseau</span>
                <span className="font-medium">Hardhat (Local)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Token ID</span>
                <span className="font-mono font-semibold">#{nft.tokenId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
