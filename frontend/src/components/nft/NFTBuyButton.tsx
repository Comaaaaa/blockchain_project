'use client';

import { useState } from 'react';
import { NFTMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import Button from '@/components/ui/Button';
import { NFTListing } from '@/types';
import { useWriteContract } from 'wagmi';
import { formatEther } from 'viem';

interface NFTBuyButtonProps {
  listing: NFTListing;
  onSuccess?: () => void;
}

export default function NFTBuyButton({ listing, onSuccess }: NFTBuyButtonProps) {
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const priceETH = formatEther(BigInt(listing.priceWei));

  const handleBuy = async () => {
    setLoading(true);
    setResult(null);

    try {
      const hash = await writeContractAsync({
        address: addresses.NFTMarketplace as `0x${string}`,
        abi: NFTMarketplaceABI,
        functionName: 'buyListing',
        args: [BigInt(listing.listingIdOnchain)],
        value: BigInt(listing.priceWei),
      });

      setResult({ success: true, message: `Achat reussi ! Tx: ${hash.slice(0, 10)}...` });
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      const msg = error?.shortMessage || error?.message || "Erreur lors de l'achat.";
      setResult({
        success: false,
        message: msg.includes('not KYC')
          ? 'Vous devez etre verifie KYC pour acheter.'
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleBuy} loading={loading} className="w-full">
        Acheter pour {priceETH} ETH
      </Button>
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
  );
}
