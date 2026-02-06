'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import TransactionTable from '@/components/transaction/TransactionTable';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import { useTransactionContext } from '@/context/TransactionContext';
import { formatCurrency } from '@/lib/utils';

export default function TransactionsPage() {
  const { state } = useTransactionContext();
  const [filter, setFilter] = useState('all');

  const filteredTransactions =
    filter === 'all'
      ? state.transactions
      : state.transactions.filter((t) => t.type === filter);

  const totalPurchases = state.transactions
    .filter((t) => t.type === 'purchase' && t.status === 'confirmed')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const totalSales = state.transactions
    .filter((t) => t.type === 'sale' && t.status === 'confirmed')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const totalDividends = state.transactions
    .filter((t) => t.type === 'dividend' && t.status === 'confirmed')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const tabs = [
    { id: 'all', label: 'Toutes', count: state.transactions.length },
    {
      id: 'purchase',
      label: 'Achats',
      count: state.transactions.filter((t) => t.type === 'purchase').length,
    },
    {
      id: 'sale',
      label: 'Ventes',
      count: state.transactions.filter((t) => t.type === 'sale').length,
    },
    {
      id: 'dividend',
      label: 'Dividendes',
      count: state.transactions.filter((t) => t.type === 'dividend').length,
    },
  ];

  return (
    <PageContainer
      title="Transactions"
      subtitle="Historique complet de vos transactions sur la blockchain"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total achats</p>
          <p className="text-xl font-bold text-orange">{formatCurrency(totalPurchases)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total ventes</p>
          <p className="text-xl font-bold text-blue-dark">{formatCurrency(totalSales)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Dividendes recus</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalDividends)}</p>
        </Card>
      </div>

      <Tabs tabs={tabs} activeTab={filter} onChange={setFilter} />

      <div className="mt-6 bg-white rounded-xl border border-gray-200">
        <TransactionTable transactions={filteredTransactions} />
      </div>
    </PageContainer>
  );
}
