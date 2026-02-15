'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Transaction } from '@/types';
import { api } from '@/lib/api';
import { formatEther, parseEther } from 'viem';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
}

type TransactionAction =
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; updates: Partial<Transaction> } }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: TransactionState = {
  transactions: [],
  loading: true,
};

function transactionReducer(state: TransactionState, action: TransactionAction): TransactionState {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, loading: false };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

function mapApiTransaction(t: any): Transaction {
  const fromAddress = (t.from_address || '').toLowerCase();
  const isNftMarketplacePurchase = fromAddress === 'nft_marketplace' && t.type === 'listing_sold';
  const mappedType = t.type === 'listing_sold' ? 'purchase' : t.type;
  const rawTokens = Number(t.tokens || 0);
  const mappedTokens = isNftMarketplacePurchase && rawTokens === 0 ? 1 : rawTokens;

  return {
    id: t.id,
    type: mappedType,
    propertyId: t.property_id || (isNftMarketplacePurchase ? `nft-${t.tx_hash || t.id}` : ''),
    propertyTitle: t.property_title || (isNftMarketplacePurchase ? 'NFT TokenImmo (Marketplace)' : ''),
    from: t.from_address || '',
    to: t.to_address || '',
    tokens: mappedTokens,
    pricePerToken: 0,
    totalAmount: t.total_amount_wei ? Number(formatEther(BigInt(t.total_amount_wei))) : 0,
    totalAmountWei: t.total_amount_wei ? String(t.total_amount_wei) : undefined,
    txHash: t.tx_hash || '',
    status: t.status || 'confirmed',
    createdAt: t.created_at || new Date().toISOString(),
    blockNumber: t.block_number,
    gasUsed: t.gas_used,
  };
}

/**
 * Persist a transaction to the backend so it survives page refreshes.
 */
async function saveTransactionToBackend(tx: Transaction) {
  try {
    const totalAmountWei = tx.totalAmountWei
      || (tx.totalAmount > 0 ? parseEther(String(tx.totalAmount)).toString() : '0');

    await api.postTransaction({
      type: tx.type === 'dividend' ? 'purchase' : tx.type,
      property_id: tx.propertyId || undefined,
      from_address: tx.from,
      to_address: tx.to,
      tokens: tx.tokens,
      total_amount_wei: totalAmountWei,
      tx_hash: tx.txHash,
      status: tx.status,
    });
  } catch (error) {
    console.error('Failed to save transaction to backend:', error);
  }
}

interface TransactionContextType {
  state: TransactionState;
  dispatch: React.Dispatch<TransactionAction>;
  addTransaction: (tx: Transaction) => void;
  refetch: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(transactionReducer, initialState);

  const fetchTransactions = async () => {
    try {
      const data = await api.getTransactions();
      dispatch({ type: 'SET_TRANSACTIONS', payload: data.map(mapApiTransaction) });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: tx });
    // Persist to backend so it survives page refreshes
    saveTransactionToBackend(tx);
  }, []);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TransactionContext.Provider value={{ state, dispatch, addTransaction, refetch: fetchTransactions }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within TransactionProvider');
  }
  return context;
}
