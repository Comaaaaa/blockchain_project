'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { NFT, NFTListing } from '@/types';
import { NFTMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import NFTListModal from '@/components/nft/NFTListModal';
import NFTBuyButton from '@/components/nft/NFTBuyButton';
import {
  getAssetTypeLabel,
  formatValuationFromWei,
  shortenAddress,
  formatDateTime,
} from '@/lib/utils';
import { useETHPrice, formatWeiAsEUR } from '@/hooks/useETHPrice';
import {
  ArrowLeftIcon,
  MapPinIcon,
  CubeIcon,
  LinkIcon,
  HomeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useAccount, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';

export default function NFTDetailPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  const { address } = useAccount();
  const { ethPrice } = useETHPrice();
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

  const [nft, setNft] = useState<NFT | null>(null);
  const [listing, setListing] = useState<NFTListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    try {
      const [data, listingsData] = await Promise.all([
        api.getNFT(Number(tokenId)),
        api.getNFTListings().catch(() => []),
      ]);

      setNft({
        tokenId: data.tokenId ?? data.token_id,
        ownerAddress: data.owner ?? data.owner_address ?? data.ownerAddress,
        assetType: data.assetType ?? data.asset_type,
        location: data.location,
        valuationWei: data.valuationWei ?? data.valuation_wei,
        tokenUri: data.tokenURI ?? data.token_uri ?? data.tokenUri,
        createdAt: data.mintedAt ? new Date(data.mintedAt * 1000).toISOString() : (data.created_at ?? data.createdAt ?? new Date().toISOString()),
        propertyId: data.propertyId ?? data.property_id,
        propertyTitle: data.propertyTitle ?? data.property_title,
        propertyCity: data.propertyCity ?? data.property_city,
      });

      // Find active listing for this tokenId
      const activeListing = listingsData.find(
        (l: any) => (l.nft_token_id ?? l.tokenId) === Number(tokenId) && l.active
      );
      if (activeListing) {
        setListing({
          listingId: activeListing.id,
          listingIdOnchain: activeListing.listing_id_onchain,
          seller: activeListing.seller_address,
          tokenId: activeListing.nft_token_id,
          priceWei: activeListing.price_wei,
          active: true,
          createdAt: activeListing.created_at,
        });
      } else {
        setListing(null);
      }
    } catch (err: any) {
      setError(err.message || 'NFT introuvable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tokenId]);

  const isOwner = nft && address && nft.ownerAddress.toLowerCase() === address.toLowerCase();

  const handleCancel = async () => {
    if (!listing) return;
    setCancelling(true);
    try {
      await writeContractAsync({
        gas: BigInt(300000),
        address: addresses.NFTMarketplace as `0x${string}`,
        abi: NFTMarketplaceABI,
        functionName: 'cancelListing',
        args: [BigInt(listing.listingIdOnchain)],
      });
      fetchData();
    } catch (err: any) {
      console.error('Cancel failed:', err);
    } finally {
      setCancelling(false);
    }
  };

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
                <p className="text-sm text-gray-400">~{formatWeiAsEUR(nft.valuationWei, ethPrice)}</p>
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

        {/* Right: Blockchain Info + Bien associe */}
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
                <span className="font-medium">Sepolia (Testnet)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Token ID</span>
                <span className="font-mono font-semibold">#{nft.tokenId}</span>
              </div>
            </div>
          </div>

          {/* Bien immobilier associe */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HomeIcon className="h-5 w-5" />
              Bien immobilier associe
            </h2>
            {nft.propertyId ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono text-sm">{nft.propertyId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Titre</span>
                  <span className="font-medium">{nft.propertyTitle}</span>
                </div>
                {nft.propertyCity && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ville</span>
                    <span className="font-medium">{nft.propertyCity}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Link
                    href={`/properties/${nft.propertyId}`}
                    className="inline-flex items-center text-sm text-orange hover:text-orange/80 font-medium transition-colors"
                  >
                    Voir le bien
                    <ArrowLeftIcon className="h-4 w-4 ml-1 rotate-180" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucun bien immobilier associe a ce NFT</p>
            )}
          </div>

          {/* Marketplace */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              Marketplace
            </h2>

            {isOwner && !listing && (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  Vous etes le proprietaire de ce NFT. Mettez-le en vente sur le marketplace.
                </p>
                <Button onClick={() => setListModalOpen(true)} className="w-full">
                  Mettre en vente
                </Button>
              </div>
            )}

            {isOwner && listing && (
              <div className="space-y-3">
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Prix de vente</p>
                  <p className="text-xl font-bold text-orange">
                    {formatEther(BigInt(listing.priceWei))} ETH
                  </p>
                  <p className="text-xs text-gray-500">~{formatWeiAsEUR(listing.priceWei, ethPrice)}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  loading={cancelling}
                  className="w-full"
                >
                  Annuler la vente
                </Button>
              </div>
            )}

            {!isOwner && listing && (
              <div className="space-y-3">
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Prix de vente</p>
                  <p className="text-xl font-bold text-orange">
                    {formatEther(BigInt(listing.priceWei))} ETH
                  </p>
                  <p className="text-xs text-gray-500">~{formatWeiAsEUR(listing.priceWei, ethPrice)}</p>
                </div>
                <NFTBuyButton listing={listing} onSuccess={fetchData} />
              </div>
            )}

            {!isOwner && !listing && (
              <p className="text-sm text-gray-500">Ce NFT n&apos;est pas en vente.</p>
            )}
          </div>
        </div>
      </div>

      {/* List Modal */}
      {nft && (
        <NFTListModal
          isOpen={listModalOpen}
          onClose={() => setListModalOpen(false)}
          nft={nft}
          onSuccess={fetchData}
        />
      )}
    </PageContainer>
  );
}
