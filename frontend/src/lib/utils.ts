import clsx, { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function generateBlockNumber(): number {
  return 5200000 + Math.floor(Math.random() * 100000);
}

export function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Appartement',
    house: 'Maison',
    commercial: 'Local commercial',
    land: 'Terrain',
  };
  return labels[type] || type;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: 'Disponible',
    funding: 'En financement',
    funded: 'Finance',
    rented: 'Loue',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    funding: 'bg-yellow-100 text-yellow-800',
    funded: 'bg-blue-100 text-blue-800',
    rented: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    purchase: 'Achat',
    sale: 'Vente',
    transfer: 'Transfert',
    swap: 'Swap',
    dividend: 'Dividende',
  };
  return labels[type] || type;
}

export function getTransactionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirme',
    failed: 'Echoue',
  };
  return labels[status] || status;
}

export function getAssetTypeLabel(assetType: string): string {
  const labels: Record<string, string> = {
    property_deed: 'Titre de propriete',
    artwork: 'Oeuvre d\'art',
    collectible: 'Objet de collection',
  };
  return labels[assetType] || assetType;
}

export function formatValuationFromWei(valuationWei: string): string {
  const wei = BigInt(valuationWei);
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(4)} ETH`;
}
