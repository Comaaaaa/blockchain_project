'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import ListingGrid from '@/components/marketplace/ListingGrid';
import CreateListingModal from '@/components/marketplace/CreateListingModal';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import { useMarketplaceContext } from '@/context/MarketplaceContext';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import { PropertyMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import { MarketplaceListing } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAccount, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';

export default function MarketplacePage() {
  const { state, activeListings, dispatch: marketplaceDispatch, refetch } = useMarketplaceContext();
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { addTransaction } = useTransactionContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

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
    } catch (error: any) {
      console.error('Buy failed:', error?.shortMessage || error?.message);
    }
  };

  const handleCancel = async (listing: MarketplaceListing) => {
    if (!isConnected || !address) return;

    try {
      await writeContractAsync({
        address: addresses.PropertyMarketplace as `0x${string}`,
        abi: PropertyMarketplaceABI,
        functionName: 'cancelListing',
        args: [BigInt(listing.id)],
      });

      marketplaceDispatch({
        type: 'UPDATE_LISTING',
        payload: { id: listing.id, updates: { status: 'cancelled' } },
      });

      setTimeout(() => refetch(), 5000);
    } catch (error: any) {
      console.error('Cancel failed:', error?.shortMessage || error?.message);
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
        <ListingGrid
          listings={displayedListings}
          onBuy={handleBuy}
          onCancel={handleCancel}
          currentAddress={address}
        />
      )}

      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </PageContainer>
  );
}
