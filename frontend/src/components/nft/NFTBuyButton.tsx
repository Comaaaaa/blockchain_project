'use client';

import { useState } from 'react';
import { NFTMarketplaceABI, ComplianceRegistryABI, getContractAddresses } from '@/lib/contracts';
import Button from '@/components/ui/Button';
import { NFTListing } from '@/types';
import { useETHPrice, formatWeiAsEUR } from '@/hooks/useETHPrice';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

interface NFTBuyButtonProps {
  listing: NFTListing;
  onSuccess?: () => void;
}

export default function NFTBuyButton({ listing, onSuccess }: NFTBuyButtonProps) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { ethPrice } = useETHPrice();
  const addresses = getContractAddresses();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const priceETH = formatEther(BigInt(listing.priceWei));

  const handleBuy = async () => {
    if (!address || !publicClient) return;

    setLoading(true);
    setResult(null);

    try {
      if (!addresses.NFTMarketplace) {
        setResult({
          success: false,
          message: 'Adresse NFT marketplace non configuree (NEXT_PUBLIC_NFT_MARKETPLACE).',
        });
        return;
      }

      if (!addresses.ComplianceRegistry) {
        setResult({
          success: false,
          message: 'Adresse registre KYC non configuree (NEXT_PUBLIC_COMPLIANCE_REGISTRY).',
        });
        return;
      }

      const [onChainListing, isCompliant] = await Promise.all([
        publicClient.readContract({
          address: addresses.NFTMarketplace as `0x${string}`,
          abi: NFTMarketplaceABI,
          functionName: 'getListing',
          args: [BigInt(listing.listingIdOnchain)],
        }),
        publicClient.readContract({
          address: addresses.ComplianceRegistry as `0x${string}`,
          abi: ComplianceRegistryABI,
          functionName: 'isCompliant',
          args: [address as `0x${string}`],
        }),
      ]);

      if (!onChainListing.active) {
        setResult({ success: false, message: 'Cette annonce NFT n\'est plus active.' });
        onSuccess?.();
        return;
      }

      if (!isCompliant) {
        setResult({
          success: false,
          message: 'Votre wallet doit etre verifie KYC pour acheter ce NFT.',
        });
        return;
      }

      if (onChainListing.seller.toLowerCase() === address.toLowerCase()) {
        setResult({ success: false, message: 'Vous ne pouvez pas acheter votre propre annonce.' });
        return;
      }

      const hash = await writeContractAsync({
        address: addresses.NFTMarketplace as `0x${string}`,
        abi: NFTMarketplaceABI,
        functionName: 'buyListing',
        args: [BigInt(listing.listingIdOnchain)],
        value: onChainListing.price,
      });

      const { waitForTransactionReceipt } = await import('wagmi/actions');
      const { wagmiConfig } = await import('@/config/wagmi');
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });

      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted on the blockchain.');
      }

      setResult({ success: true, message: `Achat reussi ! Tx: ${hash.slice(0, 10)}...` });
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error: unknown) {
      const shortMessage =
        error && typeof error === 'object' && 'shortMessage' in error
          ? (error as { shortMessage?: unknown }).shortMessage
          : undefined;
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: unknown }).message
          : undefined;
      const msg =
        (typeof shortMessage === 'string' && shortMessage.length > 0 ? shortMessage : undefined)
        || (typeof message === 'string' && message.length > 0 ? message : undefined)
        || "Erreur lors de l'achat.";
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
        Acheter pour {priceETH} ETH (~{formatWeiAsEUR(listing.priceWei, ethPrice)})
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
