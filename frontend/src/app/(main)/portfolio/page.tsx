'use client';

import { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import HoldingsList from '@/components/portfolio/HoldingsList';
import Tabs from '@/components/ui/Tabs';
import TransactionTable from '@/components/transaction/TransactionTable';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { useTransactionContext } from '@/context/TransactionContext';

const tabs = [
  { id: 'holdings', label: 'Mes tokens' },
  { id: 'history', label: 'Historique' },
];

export default function PortfolioPage() {
  const { state: portfolioState, stats } = usePortfolioContext();
  const { state: txState } = useTransactionContext();
  const [activeTab, setActiveTab] = useState('holdings');

  return (
    <PageContainer
      title="Mon Portfolio"
      subtitle="Suivez vos investissements et la performance de votre portefeuille"
    >
      <PortfolioSummary stats={stats} />

      <div className="mt-8">
        <Tabs
          tabs={tabs.map((t) => ({
            ...t,
            count:
              t.id === 'holdings'
                ? portfolioState.holdings.length
                : txState.transactions.length,
          }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="mt-6">
          {activeTab === 'holdings' ? (
            <HoldingsList holdings={portfolioState.holdings} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              <TransactionTable transactions={txState.transactions} />
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
