'use client';

import { useState } from 'react';
import { BlockchainResult } from '@/lib/blockchain';

interface UsePurchaseResult {
  loading: boolean;
  result: BlockchainResult | null;
  error: string | null;
  reset: () => void;
}

/**
 * Hook stub — token purchases are now handled directly in TokenPurchaseForm
 * using wagmi's useWriteContract for on-chain transactions.
 */
export function useTokenPurchase(): UsePurchaseResult {
  const [loading] = useState(false);
  const [result] = useState<BlockchainResult | null>(null);
  const [error] = useState<string | null>(null);

  const reset = () => {};

  return { loading, result, error, reset };
}
