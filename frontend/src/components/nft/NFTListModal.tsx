'use client';

import { useState } from 'react';
import { PropertyNFTABI, NFTMarketplaceABI, getContractAddresses } from '@/lib/contracts';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { NFT } from '@/types';
import { useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

interface NFTListModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  onSuccess?: () => void;
}

export default function NFTListModal({ isOpen, onClose, nft, onSuccess }: NFTListModalProps) {
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();
  const marketplaceAddr = addresses.NFTMarketplace as `0x${string}`;

  const { data: feeBps } = useReadContract({
    address: marketplaceAddr,
    abi: NFTMarketplaceABI,
    functionName: 'feeBps',
    query: { enabled: Boolean(addresses.NFTMarketplace) },
  });

  const [priceETH, setPriceETH] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'approving' | 'listing' | 'done'>('idle');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const numericPrice = parseFloat(priceETH);
  const effectiveFeeBps = Number(feeBps ?? 100n);
  const feePercentLabel = (effectiveFeeBps / 100).toFixed(2).replace(/\.00$/, '');
  const feeAmountEth = Number.isFinite(numericPrice) && numericPrice > 0
    ? (numericPrice * (effectiveFeeBps / 10000)).toFixed(6)
    : '0.000000';

  const handleList = async () => {
    if (!priceETH || parseFloat(priceETH) <= 0) return;

    setLoading(true);
    setResult(null);

    try {
      const priceWei = parseEther(priceETH);
      const nftContractAddr = addresses.PropertyNFT as `0x${string}`;

      // Step 1: Approve marketplace to transfer the NFT
      setStep('approving');
      await writeContractAsync({
        address: nftContractAddr,
        abi: PropertyNFTABI,
        functionName: 'approve',
        args: [marketplaceAddr, BigInt(nft.tokenId)],
      });

      // Step 2: Create listing on NFTMarketplace
      setStep('listing');
      const hash = await writeContractAsync({
        address: marketplaceAddr,
        abi: NFTMarketplaceABI,
        functionName: 'createListing',
        args: [nftContractAddr, BigInt(nft.tokenId), priceWei],
      });

      setStep('done');
      setResult({ success: true, message: `NFT mis en vente ! Tx: ${hash.slice(0, 10)}...` });
      setTimeout(() => {
        onClose();
        setResult(null);
        setPriceETH('');
        setStep('idle');
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      const msg = error?.shortMessage || error?.message || 'Erreur lors de la mise en vente.';
      setResult({
        success: false,
        message: msg.includes('not KYC')
          ? 'Vous devez etre verifie KYC pour mettre en vente.'
          : msg,
      });
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = step === 'approving'
    ? 'Approbation en cours...'
    : step === 'listing'
    ? 'Creation de la vente...'
    : step === 'done'
    ? 'Termine !'
    : 'Mettre en vente';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vendre TIMMO #${nft.tokenId}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">NFT</span>
            <span className="font-semibold">TIMMO #{nft.tokenId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type</span>
            <span>{nft.assetType}</span>
          </div>
          {nft.propertyTitle && (
            <div className="flex justify-between">
              <span className="text-gray-600">Bien</span>
              <span>{nft.propertyTitle}</span>
            </div>
          )}
        </div>

        <Input
          label="Prix de vente (ETH)"
          type="number"
          step="0.001"
          min="0.001"
          placeholder="0.5"
          value={priceETH}
          onChange={(e) => setPriceETH(e.target.value)}
        />

        {priceETH && numericPrice > 0 && (
          <div className="bg-orange-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Prix total</span>
              <span className="font-bold text-orange">{priceETH} ETH</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Frais marketplace ({feePercentLabel}%)</span>
              <span>{feeAmountEth} ETH</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleList}
          loading={loading}
          disabled={!priceETH || numericPrice <= 0}
          className="w-full"
        >
          {stepLabel}
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
    </Modal>
  );
}
