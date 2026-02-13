'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Transaction } from '@/types';
import { api } from '@/lib/api';

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
  return {
    id: t.id,
    type: t.type === 'listing_sold' ? 'purchase' : t.type,
    propertyId: t.property_id || '',
    propertyTitle: t.property_title || '',
    from: t.from_address || '',
    to: t.to_address || '',
    tokens: t.tokens || 0,
    pricePerToken: 0,
    totalAmount: parseFloat(t.total_amount_wei) || 0,
    txHash: t.tx_hash || '',
    status: t.status || 'confirmed',
    createdAt: t.created_at || new Date().toISOString(),
    blockNumber: t.block_number,
    gasUsed: t.gas_used,
  };
}

interface TransactionContextType {
  state: TransactionState;
  dispatch: React.Dispatch<TransactionAction>;
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

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TransactionContext.Provider value={{ state, dispatch, refetch: fetchTransactions }}>
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
