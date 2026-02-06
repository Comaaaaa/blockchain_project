'use client';

import { useState } from 'react';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useMarketplaceContext } from '@/context/MarketplaceContext';
import { useTransactionContext } from '@/context/TransactionContext';
import { simulateCreateListing } from '@/lib/blockchain';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { v4 as uuidv4 } from 'uuid';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateListingModal({ isOpen, onClose }: CreateListingModalProps) {
  const { state: portfolioState } = usePortfolioContext();
  const { dispatch: marketplaceDispatch } = useMarketplaceContext();
  const [selectedProperty, setSelectedProperty] = useState('');
  const [tokens, setTokens] = useState(1);
  const [pricePerToken, setPricePerToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const holding = portfolioState.holdings.find((h) => h.propertyId === selectedProperty);

  const propertyOptions = [
    { value: '', label: 'Selectionnez un bien' },
    ...portfolioState.holdings.map((h) => ({
      value: h.propertyId,
      label: `${h.property.title} (${h.tokens} tokens)`,
    })),
  ];

  const handleCreate = async () => {
    if (!holding || tokens < 1 || pricePerToken < 1) return;

    setLoading(true);
    setResult(null);

    try {
      const txResult = await simulateCreateListing(selectedProperty, tokens, pricePerToken);

      if (txResult.success) {
        marketplaceDispatch({
          type: 'ADD_LISTING',
          payload: {
            id: uuidv4(),
            sellerId: 'demo-user',
            sellerAddress: '0x1234567890AbcdEF1234567890aBcDeF12345678',
            propertyId: selectedProperty,
            property: holding.property,
            tokensForSale: tokens,
            pricePerToken,
            totalPrice: tokens * pricePerToken,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        });

        setResult({ success: true, message: 'Offre creee avec succes !' });
        setTimeout(() => {
          onClose();
          setResult(null);
          setSelectedProperty('');
          setTokens(1);
          setPricePerToken(0);
        }, 1500);
      } else {
        setResult({
          success: false,
          message: txResult.error || 'Erreur lors de la creation.',
        });
      }
    } catch {
      setResult({ success: false, message: 'Erreur inattendue.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Creer une offre de vente">
      <div className="space-y-4">
        <Select
          label="Bien a vendre"
          options={propertyOptions}
          value={selectedProperty}
          onChange={(e) => {
            setSelectedProperty(e.target.value);
            const h = portfolioState.holdings.find((h) => h.propertyId === e.target.value);
            if (h) setPricePerToken(Math.round(h.currentValue * 1.05));
          }}
        />

        {holding && (
          <>
            <Input
              label={`Nombre de tokens (max: ${holding.tokens})`}
              type="number"
              min={1}
              max={holding.tokens}
              value={tokens}
              onChange={(e) => setTokens(Math.min(parseInt(e.target.value) || 1, holding.tokens))}
            />

            <Input
              label="Prix par token (EUR)"
              type="number"
              min={1}
              value={pricePerToken}
              onChange={(e) => setPricePerToken(parseInt(e.target.value) || 0)}
            />

            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Prix actuel du token</span>
                <span>{formatCurrency(holding.currentValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Votre prix de vente</span>
                <span className="font-semibold text-orange">{formatCurrency(pricePerToken)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-orange">
                  {formatCurrency(tokens * pricePerToken)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              loading={loading}
              disabled={tokens < 1 || pricePerToken < 1}
              className="w-full"
            >
              Mettre en vente
            </Button>
          </>
        )}

        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </Modal>
  );
}
