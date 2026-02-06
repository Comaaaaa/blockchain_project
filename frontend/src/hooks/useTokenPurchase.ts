'use client';

import { useState } from 'react';
import { Property } from '@/types';
import { simulateTokenPurchase, BlockchainResult } from '@/lib/blockchain';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';
import { v4 as uuidv4 } from 'uuid';

interface UsePurchaseResult {
  loading: boolean;
  result: BlockchainResult | null;
  error: string | null;
  purchase: (property: Property, tokens: number) => Promise<boolean>;
  reset: () => void;
}

export function useTokenPurchase(): UsePurchaseResult {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BlockchainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { dispatch: portfolioDispatch } = usePortfolioContext();
  const { dispatch: txDispatch } = useTransactionContext();

  const purchase = async (property: Property, tokens: number): Promise<boolean> => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const txResult = await simulateTokenPurchase(
        property.id,
        tokens,
        property.tokenInfo.tokenPrice
      );
      setResult(txResult);

      const totalAmount = tokens * property.tokenInfo.tokenPrice;

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
          totalAmount,
          txHash: txResult.txHash,
          status: txResult.success ? 'confirmed' : 'failed',
          createdAt: new Date().toISOString(),
          blockNumber: txResult.blockNumber,
          gasUsed: txResult.gasUsed,
        },
      });

      if (txResult.success) {
        portfolioDispatch({
          type: 'ADD_HOLDING',
          payload: {
            propertyId: property.id,
            tokens,
            pricePerToken: property.tokenInfo.tokenPrice,
          },
        });
      } else {
        setError(txResult.error || 'Transaction echouee');
      }

      return txResult.success;
    } catch (err) {
      setError('Erreur inattendue');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { loading, result, error, purchase, reset };
}
