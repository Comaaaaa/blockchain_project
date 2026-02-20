'use client';

import { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import ListingGrid from '@/components/marketplace/ListingGrid';
import CreateListingModal from '@/components/marketplace/CreateListingModal';
import NFTGrid from '@/components/nft/NFTGrid';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import { useMarketplaceContext } from '@/context/MarketplaceContext';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import { api } from '@/lib/api';
import { PropertyMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import { MarketplaceListing, NFT, NFTListing } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const shortMessage = 'shortMessage' in error ? (error as { shortMessage?: unknown }).shortMessage : undefined;
    if (typeof shortMessage === 'string' && shortMessage.length > 0) return shortMessage;

    const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
    if (typeof message === 'string' && message.length > 0) return message;
  }

  return 'Unknown error';
}

export default function MarketplacePage() {
  const { state, activeListings, dispatch: marketplaceDispatch, refetch } = useMarketplaceContext();
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { addTransaction } = useTransactionContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [cancellingListingId, setCancellingListingId] = useState<string | null>(null);
  const [nftListings, setNftListings] = useState<NFTListing[]>([]);
  const [listedNfts, setListedNfts] = useState<NFT[]>([]);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

  const fetchActiveNftListings = async () => {
    try {
      const [nftData, listingData] = await Promise.all([
        api.getNFTs(),
        api.getNFTListings().catch(() => []),
      ]);

      const activeListings: NFTListing[] = listingData
        .map((item: any) => ({
          listingId: Number(item.id),
          listingIdOnchain: Number(item.listing_id_onchain ?? 0),
          seller: item.seller_address,
          tokenId: Number(item.nft_token_id),
          priceWei: item.price_wei,
          active: !!item.active,
          createdAt: item.created_at,
          assetType: item.asset_type,
          location: item.location,
          propertyTitle: item.property_title,
        }))
        .filter((item) => item.active && Number.isFinite(item.listingId) && Number.isFinite(item.tokenId));

      const nftByTokenId = new Map<number, NFT>(
        nftData
          .map((item: any) => ({
            tokenId: Number(item.token_id ?? item.tokenId),
            ownerAddress: item.owner_address ?? item.ownerAddress,
            assetType: item.asset_type ?? item.assetType,
            location: item.location,
            valuationWei: item.valuation_wei ?? item.valuationWei,
            tokenUri: item.token_uri ?? item.tokenUri,
            createdAt: item.created_at ?? item.createdAt,
            propertyId: item.property_id ?? item.propertyId,
            propertyTitle: item.property_title ?? item.propertyTitle,
            propertyCity: item.property_city ?? item.propertyCity,
          }))
          .filter((item) => Number.isFinite(item.tokenId))
          .map((item) => [item.tokenId, item])
      );

      const activeNfts = activeListings
        .map((listing) => nftByTokenId.get(listing.tokenId))
        .filter((item): item is NFT => Boolean(item));

      setNftListings(activeListings);
      setListedNfts(activeNfts);
    } catch (error) {
      console.error('Failed to fetch NFT listings for marketplace:', getErrorMessage(error));
      setNftListings([]);
      setListedNfts([]);
    }
  };

  useEffect(() => {
    fetchActiveNftListings();
  }, []);

  const myListings = state.listings.filter(
    (l) => address && l.sellerAddress.toLowerCase() === address.toLowerCase()
  );
  const soldListings = state.listings.filter((l) => l.status === 'sold' || l.status === 'cancelled');

  const tabs = [
    { id: 'active', label: 'Offres actives', count: activeListings.length },
    { id: 'my', label: 'Mes offres', count: myListings.length },
    { id: 'history', label: 'Historique', count: soldListings.length },
  ];

  const displayedListings =
    activeTab === 'active'
      ? activeListings
      : activeTab === 'my'
        ? myListings
        : soldListings;

  const handleBuy = async (listing: MarketplaceListing) => {
    if (!isConnected || !address) return;

    try {
      const pricePerTokenWei = listing.pricePerTokenWei || '0';
      const totalPrice = BigInt(listing.tokensForSale) * BigInt(pricePerTokenWei);

      const hash = await writeContractAsync({
        gas: BigInt(300000),
        address: addresses.PropertyMarketplace as `0x${string}`,
        abi: PropertyMarketplaceABI,
        functionName: 'buyListing',
        args: [BigInt(listing.id)],
        value: totalPrice,
      });

      marketplaceDispatch({
        type: 'UPDATE_LISTING',
        payload: { id: listing.id, updates: { status: 'sold' } },
      });

      portfolioDispatch({
        type: 'ADD_HOLDING',
        payload: {
          propertyId: listing.propertyId,
          tokens: listing.tokensForSale,
          pricePerToken: Number(formatEther(BigInt(pricePerTokenWei))),
        },
      });

      addTransaction({
        id: uuidv4(),
        type: 'purchase',
        propertyId: listing.propertyId,
        propertyTitle: listing.property.title,
        from: listing.sellerAddress,
        to: address,
        tokens: listing.tokensForSale,
        pricePerToken: Number(formatEther(BigInt(pricePerTokenWei))),
        totalAmount: Number(formatEther(totalPrice)),
        totalAmountWei: totalPrice.toString(),
        txHash: hash,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      });

      setTimeout(() => refetch(), 5000);
    } catch (error: unknown) {
      console.error('Buy failed:', getErrorMessage(error));
    }
  };

  const handleCancel = async (listing: MarketplaceListing) => {
    if (!isConnected || !address || !publicClient) return;

    if (listing.status !== 'active') {
      return;
    }

    const listingId = Number(listing.id);
    if (!Number.isInteger(listingId) || listingId < 0) {
      console.error('Cancel failed: invalid listing id', listing.id);
      return;
    }

    try {
      setCancellingListingId(listing.id);

      const onChainListing = await publicClient.readContract({
        address: addresses.PropertyMarketplace as `0x${string}`,
        abi: PropertyMarketplaceABI,
        functionName: 'getListing',
        args: [BigInt(listingId)],
      });

      if (!onChainListing.active) {
        marketplaceDispatch({
          type: 'UPDATE_LISTING',
          payload: { id: listing.id, updates: { status: 'cancelled' } },
        });
        refetch();
        return;
      }

      if (onChainListing.seller.toLowerCase() !== address.toLowerCase()) {
        console.error('Cancel failed: connected wallet is not the seller for this listing');
        return;
      }

      await writeContractAsync({
        gas: BigInt(300000),
        address: addresses.PropertyMarketplace as `0x${string}`,
        abi: PropertyMarketplaceABI,
        functionName: 'cancelListing',
        args: [BigInt(listingId)],
      });

      marketplaceDispatch({
        type: 'UPDATE_LISTING',
        payload: { id: listing.id, updates: { status: 'cancelled' } },
      });

      setTimeout(() => refetch(), 5000);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message.includes('Listing not active')) {
        marketplaceDispatch({
          type: 'UPDATE_LISTING',
          payload: { id: listing.id, updates: { status: 'cancelled' } },
        });
        refetch();
        return;
      }
      console.error('Cancel failed:', message);
    } finally {
      setCancellingListingId(null);
    }
  };

  return (
    <PageContainer
      title="Marketplace"
      subtitle="Achetez et vendez des tokens immobiliers sur le marche secondaire"
    >
      <div className="flex items-center justify-between mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <Button onClick={() => setShowCreateModal(true)} disabled={!isConnected}>
          <PlusIcon className="h-5 w-5 mr-1" />
          Creer une offre
        </Button>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
          Connectez votre wallet pour acheter ou vendre des tokens sur le marketplace.
        </div>
      )}

      {state.loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange mx-auto mb-4" />
          <p className="text-gray-500">Chargement des offres...</p>
        </div>
      ) : (
        <>
          <ListingGrid
            listings={displayedListings}
            onBuy={handleBuy}
            onCancel={handleCancel}
            currentAddress={address}
            cancellingListingId={cancellingListingId}
          />

          {activeTab === 'active' && listedNfts.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">NFTs en vente</h2>
              <NFTGrid nfts={listedNfts} listings={nftListings} />
            </div>
          )}
        </>
      )}

      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </PageContainer>
  );
}
