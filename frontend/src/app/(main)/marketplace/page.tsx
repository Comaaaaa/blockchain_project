'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import ListingGrid from '@/components/marketplace/ListingGrid';
import CreateListingModal from '@/components/marketplace/CreateListingModal';
import Button from '@/components/ui/Button';
import { useMarketplaceContext } from '@/context/MarketplaceContext';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import { simulateBuyFromListing } from '@/lib/blockchain';
import { MarketplaceListing } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function MarketplacePage() {
  const { activeListings, dispatch: marketplaceDispatch } = useMarketplaceContext();
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { dispatch: txDispatch } = useTransactionContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (listing: MarketplaceListing) => {
    setBuying(listing.id);

    try {
      const result = await simulateBuyFromListing(listing.id, listing.tokensForSale);

      if (result.success) {
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

        txDispatch({
          type: 'ADD_TRANSACTION',
          payload: {
            id: uuidv4(),
            type: 'purchase',
            propertyId: listing.propertyId,
            propertyTitle: listing.property.title,
            from: listing.sellerAddress,
            to: '0x1234567890AbcdEF1234567890aBcDeF12345678',
            tokens: listing.tokensForSale,
            pricePerToken: listing.pricePerToken,
            totalAmount: listing.totalPrice,
            txHash: result.txHash,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
          },
        });
      }
    } catch {
      // Error handled silently
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
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-1" />
          Creer une offre
        </Button>
      </div>

      <ListingGrid listings={activeListings} onBuy={handleBuy} />

      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </PageContainer>
  );
}
