'use client';

import { useState } from 'react';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useMarketplaceContext } from '@/context/MarketplaceContext';
import { PropertyTokenABI, PropertyMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import { formatETH } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useAccount, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateListingModal({ isOpen, onClose }: CreateListingModalProps) {
  const { state: portfolioState } = usePortfolioContext();
  const { refetch } = useMarketplaceContext();
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

  const [selectedProperty, setSelectedProperty] = useState('');
  const [tokens, setTokens] = useState(1);
  const [pricePerTokenETH, setPricePerTokenETH] = useState('');
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

  let priceWei = BigInt(0);
  try {
    if (pricePerTokenETH && /^\d*\.?\d*$/.test(pricePerTokenETH) && pricePerTokenETH !== '.') {
      priceWei = parseEther(pricePerTokenETH);
    }
  } catch {
    // Invalid input, keep 0
  }
  const totalWei = priceWei * BigInt(tokens);

  const handleCreate = async () => {
    if (!holding || tokens < 1 || !pricePerTokenETH || !isConnected) return;

    setLoading(true);
    setResult(null);

    try {
      const tokenAddr = holding.property.tokenInfo.contractAddress;
      if (!tokenAddr) {
        setResult({ success: false, message: 'Pas de contrat token pour ce bien.' });
        setLoading(false);
        return;
      }

      // 1. Approve marketplace to spend tokens
      await writeContractAsync({
        address: tokenAddr as `0x${string}`,
        abi: PropertyTokenABI,
        functionName: 'approve',
        args: [addresses.PropertyMarketplace as `0x${string}`, BigInt(tokens)],
      });

      // 2. Create listing on marketplace
      const hash = await writeContractAsync({
        address: addresses.PropertyMarketplace as `0x${string}`,
        abi: PropertyMarketplaceABI,
        functionName: 'createListing',
        args: [tokenAddr as `0x${string}`, BigInt(tokens), priceWei],
      });

      setResult({ success: true, message: `Offre creee avec succes ! Tx: ${hash.slice(0, 10)}...` });
      setTimeout(() => {
        onClose();
        setResult(null);
        setSelectedProperty('');
        setTokens(1);
        setPricePerTokenETH('');
        refetch();
      }, 1500);
    } catch (error: any) {
      const msg = error?.shortMessage || error?.message || 'Erreur lors de la creation.';
      setResult({
        success: false,
        message: msg.includes('not KYC')
          ? 'Vous devez etre verifie KYC pour creer une offre.'
          : msg,
      });
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
            if (h) {
              let baseWei = 0n;
              if (h.property.tokenInfo.tokenPriceWei) {
                baseWei = BigInt(h.property.tokenInfo.tokenPriceWei);
              } else if (h.property.tokenInfo.tokenPrice > 0) {
                baseWei = parseEther(String(h.property.tokenInfo.tokenPrice));
              }

              if (baseWei > 0n) {
                const suggestedWei = (baseWei * 105n) / 100n;
                const suggestedEth = formatEther(suggestedWei);
                const [intPart, fracPart = ''] = suggestedEth.split('.');
                setPricePerTokenETH(`${intPart}.${fracPart.slice(0, 6)}`.replace(/\.$/, ''));
              }
            }
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
              label="Prix par token (ETH)"
              type="text"
              placeholder="0.001"
              value={pricePerTokenETH}
              onChange={(e) => setPricePerTokenETH(e.target.value)}
            />

            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              {(holding.property.tokenInfo.tokenPriceWei || holding.property.tokenInfo.tokenPrice > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Prix initial du token</span>
                  <span>{formatETH(holding.property.tokenInfo.tokenPriceWei || 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Votre prix de vente</span>
                <span className="font-semibold text-orange">
                  {priceWei > BigInt(0) ? formatETH(priceWei.toString()) : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="font-semibold">Total ({tokens} tokens)</span>
                <span className="font-bold text-orange">
                  {totalWei > BigInt(0) ? formatETH(totalWei.toString()) : '—'}
                </span>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              loading={loading}
              disabled={tokens < 1 || !pricePerTokenETH || priceWei === BigInt(0) || !isConnected}
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
