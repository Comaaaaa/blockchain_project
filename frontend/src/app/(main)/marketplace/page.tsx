'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import ListingGrid from '@/components/marketplace/ListingGrid';
import CreateListingModal from '@/components/marketplace/CreateListingModal';
import Button from '@/components/ui/Button';
import { useMarketplaceContext } from '@/context/MarketplaceContext';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import { PropertyMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import { MarketplaceListing } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

export default function MarketplacePage() {
  const { activeListings, dispatch: marketplaceDispatch, refetch } = useMarketplaceContext();
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { addTransaction } = useTransactionContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

  const handleBuy = async (listing: MarketplaceListing) => {
    if (!isConnected || !address) return;
    setBuying(listing.id);

    try {
      const totalPrice = BigInt(listing.tokensForSale) * BigInt(Math.floor(listing.pricePerToken));

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
          pricePerToken: listing.pricePerToken,
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
        pricePerToken: listing.pricePerToken,
        totalAmount: listing.totalPrice,
        txHash: hash,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      });

      // Refetch from backend after some time (indexer will pick it up)
      setTimeout(() => refetch(), 5000);
    } catch (error: any) {
      console.error('Buy failed:', error?.shortMessage || error?.message);
    } finally {
      setBuying(null);
    }
  };

  return (
    <PageContainer
      title="Marketplace"
      subtitle="Achetez et vendez des tokens immobiliers sur le marche secondaire"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {activeListings.length} offre{activeListings.length > 1 ? 's' : ''} active
          {activeListings.length > 1 ? 's' : ''}
        </p>
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

      <ListingGrid listings={activeListings} onBuy={handleBuy} />

      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </PageContainer>
  );
}
