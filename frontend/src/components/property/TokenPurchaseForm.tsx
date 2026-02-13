'use client';

import { useState } from 'react';
import { Property } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { PropertyTokenABI, getContractAddresses } from '@/lib/contracts';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import Button from '@/components/ui/Button';
import { v4 as uuidv4 } from 'uuid';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

interface TokenPurchaseFormProps {
  property: Property;
}

export default function TokenPurchaseForm({ property }: TokenPurchaseFormProps) {
  const [tokens, setTokens] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { dispatch: txDispatch } = useTransactionContext();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const totalCost = tokens * property.tokenInfo.tokenPrice;
  const maxTokens = property.tokenInfo.availableTokens;
  const tokenAddress = property.tokenInfo.contractAddress;

  const handlePurchase = async () => {
    if (tokens < 1 || tokens > maxTokens) return;

    setLoading(true);
    setResult(null);

    try {
      if (!isConnected || !address) {
        setResult({ success: false, message: 'Veuillez connecter votre wallet.' });
        setLoading(false);
        return;
      }

      if (!tokenAddress) {
        setResult({ success: false, message: 'Ce bien n\'a pas encore de token deploye on-chain.' });
        setLoading(false);
        return;
      }

      // Call buyTokens on the PropertyToken contract
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: PropertyTokenABI,
        functionName: 'buyTokens',
        args: [BigInt(tokens)],
        value: parseEther('0.001') * BigInt(tokens), // tokenPrice * tokens
      });

      // Record transaction
      txDispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          id: uuidv4(),
          type: 'purchase',
          propertyId: property.id,
          propertyTitle: property.title,
          from: '0x0000000000000000000000000000000000000000',
          to: address,
          tokens,
          pricePerToken: property.tokenInfo.tokenPrice,
          totalAmount: totalCost,
          txHash: hash,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        },
      });

      portfolioDispatch({
        type: 'ADD_HOLDING',
        payload: {
          propertyId: property.id,
          tokens,
          pricePerToken: property.tokenInfo.tokenPrice,
          property,
        },
      });

      setResult({
        success: true,
        message: `Achat de ${tokens} token${tokens > 1 ? 's' : ''} ${property.tokenInfo.tokenSymbol} confirme ! Tx: ${hash.slice(0, 10)}...`,
      });
      setTokens(1);
    } catch (error: any) {
      const msg = error?.shortMessage || error?.message || 'Transaction echouee';
      setResult({
        success: false,
        message: msg.includes('not KYC')
          ? 'Vous devez etre verifie KYC (whitelist) pour acheter des tokens.'
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  if (maxTokens === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <p className="text-gray-500 font-medium">Tous les tokens ont ete vendus</p>
        <p className="text-sm text-gray-400 mt-1">
          Consultez le marketplace pour acheter sur le marche secondaire
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Acheter des tokens</h3>

      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
          Connectez votre wallet pour acheter des tokens on-chain.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de tokens
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTokens(Math.max(1, tokens - 1))}
              className="w-10 h-10 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-xl"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={maxTokens}
              value={tokens}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setTokens(Math.min(Math.max(1, val), maxTokens));
              }}
              className="w-24 text-center px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
            />
            <button
              onClick={() => setTokens(Math.min(maxTokens, tokens + 1))}
              className="w-10 h-10 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-xl"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {maxTokens} tokens disponibles
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Prix par token</span>
            <span className="font-medium">{formatCurrency(property.tokenInfo.tokenPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Quantite</span>
            <span className="font-medium">x {tokens}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Gas estime</span>
            <span className="font-medium text-gray-400">~0.005 ETH</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-xl text-orange">{formatCurrency(totalCost)}</span>
          </div>
        </div>

        <Button
          onClick={handlePurchase}
          loading={loading}
          disabled={tokens < 1 || tokens > maxTokens || !isConnected}
          className="w-full"
          size="lg"
        >
          {loading ? 'Transaction en cours...' : `Acheter ${tokens} token${tokens > 1 ? 's' : ''}`}
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

        <p className="text-xs text-gray-400 text-center">
          Transactions on-chain sur Ethereum Sepolia (testnet).
        </p>
      </div>
    </div>
  );
}
