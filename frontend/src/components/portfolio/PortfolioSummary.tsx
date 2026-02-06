'use client';

import { PortfolioStats } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import Card from '@/components/ui/Card';
import {
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
  Square3Stack3DIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

interface PortfolioSummaryProps {
  stats: PortfolioStats;
}

export default function PortfolioSummary({ stats }: PortfolioSummaryProps) {
  const statCards = [
    {
      label: 'Valeur totale',
      value: formatCurrency(stats.currentValue),
      icon: CurrencyEuroIcon,
      color: 'text-orange',
      bgColor: 'bg-orange/10',
    },
    {
      label: 'Plus-value',
      value: `${stats.totalGain >= 0 ? '+' : ''}${formatCurrency(stats.totalGain)}`,
      subtitle: `${stats.totalGainPercent >= 0 ? '+' : ''}${formatPercent(stats.totalGainPercent)}`,
      icon: ArrowTrendingUpIcon,
      color: stats.totalGain >= 0 ? 'text-green-600' : 'text-red-500',
      bgColor: stats.totalGain >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      label: 'Tokens detenus',
      value: stats.totalTokens.toString(),
      subtitle: `${stats.totalProperties} bien${stats.totalProperties > 1 ? 's' : ''}`,
      icon: Square3Stack3DIcon,
      color: 'text-blue-dark',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Revenu mensuel',
      value: formatCurrency(Math.round(stats.monthlyIncome)),
      subtitle: `Rdt moy: ${formatPercent(stats.averageYield)}`,
      icon: BuildingOffice2Icon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              {stat.subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{stat.subtitle}</p>
              )}
            </div>
            <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
