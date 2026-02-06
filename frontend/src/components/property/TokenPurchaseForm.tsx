'use client';

import { useState } from 'react';
import { Property } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { simulateTokenPurchase } from '@/lib/blockchain';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import Button from '@/components/ui/Button';
import { v4 as uuidv4 } from 'uuid';
import { generateTxHash } from '@/lib/utils';

interface TokenPurchaseFormProps {
  property: Property;
}

export default function TokenPurchaseForm({ property }: TokenPurchaseFormProps) {
  const [tokens, setTokens] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { dispatch: txDispatch } = useTransactionContext();

  const totalCost = tokens * property.tokenInfo.tokenPrice;
  const maxTokens = property.tokenInfo.availableTokens;

  const handlePurchase = async () => {
    if (tokens < 1 || tokens > maxTokens) return;

    setLoading(true);
    setResult(null);

    try {
      const txResult = await simulateTokenPurchase(
        property.id,
        tokens,
        property.tokenInfo.tokenPrice
      );

      if (txResult.success) {
        portfolioDispatch({
          type: 'ADD_HOLDING',
          payload: {
            propertyId: property.id,
            tokens,
            pricePerToken: property.tokenInfo.tokenPrice,
          },
        });

        txDispatch({
          type: 'ADD_TRANSACTION',
          payload: {
            id: uuidv4(),
            type: 'purchase',
            propertyId: property.id,
            propertyTitle: property.title,
            from: '0x0000000000000000000000000000000000000000',
            to: '0x1234567890AbcdEF1234567890aBcDeF12345678',
            tokens,
            pricePerToken: property.tokenInfo.tokenPrice,
            totalAmount: totalCost,
            txHash: txResult.txHash,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            blockNumber: txResult.blockNumber,
            gasUsed: txResult.gasUsed,
          },
        });

        setResult({
          success: true,
          message: `Achat de ${tokens} token${tokens > 1 ? 's' : ''} ${property.tokenInfo.tokenSymbol} confirme !`,
        });
        setTokens(1);
      } else {
        txDispatch({
          type: 'ADD_TRANSACTION',
          payload: {
            id: uuidv4(),
            type: 'purchase',
            propertyId: property.id,
            propertyTitle: property.title,
            from: '0x0000000000000000000000000000000000000000',
            to: '0x1234567890AbcdEF1234567890aBcDeF12345678',
            tokens,
            pricePerToken: property.tokenInfo.tokenPrice,
            totalAmount: totalCost,
            txHash: txResult.txHash,
            status: 'failed',
            createdAt: new Date().toISOString(),
          },
        });

        setResult({
          success: false,
          message: txResult.error || 'La transaction a echoue. Veuillez reessayer.',
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Erreur inattendue. Veuillez reessayer.',
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
            {maxTokens} tokens disponibles - Max par transaction: {Math.min(maxTokens, 1000)}
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
          disabled={tokens < 1 || tokens > maxTokens}
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
          Les transactions sont simulees sur le testnet Sepolia. Aucun argent reel n&apos;est
          implique.
        </p>
      </div>
    </div>
  );
}
