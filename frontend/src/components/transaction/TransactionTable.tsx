'use client';

import { Transaction } from '@/types';
import {
  formatCurrency,
  formatDateTime,
  shortenAddress,
  getTransactionTypeLabel,
  getTransactionStatusLabel,
} from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { useETHPrice, weiToEUR } from '@/hooks/useETHPrice';

interface TransactionTableProps {
  transactions: Transaction[];
}

function getTypeVariant(type: string): 'success' | 'danger' | 'info' | 'warning' {
  const map: Record<string, 'success' | 'danger' | 'info' | 'warning'> = {
    purchase: 'success',
    sale: 'danger',
    transfer: 'info',
    swap: 'info',
    dividend: 'warning',
  };
  return map[type] || 'info';
}

function getStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
    confirmed: 'success',
    failed: 'danger',
    pending: 'warning',
  };
  return map[status] || 'default';
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  const { ethPrice } = useETHPrice();

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Aucune transaction.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Bien</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tokens</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Montant</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tx Hash</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Statut</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm text-gray-600">
                {formatDateTime(tx.createdAt)}
              </td>
              <td className="py-3 px-4">
                <Badge variant={getTypeVariant(tx.type)}>
                  {getTransactionTypeLabel(tx.type)}
                </Badge>
              </td>
              <td className="py-3 px-4 text-sm text-gray-900 max-w-[200px] truncate">
                {tx.propertyTitle}
              </td>
              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                {tx.type === 'dividend' ? '-' : tx.tokens}
              </td>
              <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                {formatCurrency(
                  tx.totalAmountWei
                    ? weiToEUR(BigInt(tx.totalAmountWei), ethPrice)
                    : tx.totalAmount
                )}
              </td>
              <td className="py-3 px-4 text-sm text-gray-500 font-mono">
                {shortenAddress(tx.txHash, 6)}
              </td>
              <td className="py-3 px-4">
                <Badge variant={getStatusVariant(tx.status)}>
                  {getTransactionStatusLabel(tx.status)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
