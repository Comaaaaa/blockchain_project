'use client';

import { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { api } from '@/lib/api';
import { TokenSwapPoolABI, PropertyTokenABI, getContractAddresses } from '@/lib/contracts';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const addresses = getContractAddresses();

  const [direction, setDirection] = useState<'eth_to_token' | 'token_to_eth'>('eth_to_token');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [oraclePrice, setOraclePrice] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchPoolInfo = async () => {
    try {
      const info = await api.getPoolInfo();
      setPoolInfo(info);
    } catch {
      // Pool may not be deployed
    }
  };

  const fetchOraclePrice = async () => {
    try {
      if (addresses.PropertyToken_PAR7E) {
        const price = await api.getOraclePrice(addresses.PropertyToken_PAR7E);
        setOraclePrice(price);
        const history = await api.getPriceHistory(addresses.PropertyToken_PAR7E, 20);
        setPriceHistory(history);
      }
    } catch {
      // Oracle may not be deployed
    }
  };

  useEffect(() => {
    fetchPoolInfo();
    fetchOraclePrice();
    const interval = setInterval(() => {
      fetchPoolInfo();
      fetchOraclePrice();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      const q = await api.getSwapQuote(direction, amount);
      if (direction === 'eth_to_token') {
        setQuote(`${q.tokenOut} PAR7E`);
      } else {
        setQuote(`${q.ethOutFormatted} ETH`);
      }
    } catch {
      setQuote('Liquidite insuffisante');
    }
  };

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const timeout = setTimeout(getQuote, 500);
      return () => clearTimeout(timeout);
    } else {
      setQuote(null);
    }
  }, [amount, direction]);

  const handleSwap = async () => {
    if (!isConnected || !amount) return;
    setLoading(true);
    setResult(null);

    try {
      let hash: string;

      if (direction === 'eth_to_token') {
        hash = await writeContractAsync({
          address: addresses.TokenSwapPool as `0x${string}`,
          abi: TokenSwapPoolABI,
          functionName: 'swapETHForToken',
          value: parseEther(amount),
        });
      } else {
        // Approve first
        await writeContractAsync({
          address: addresses.PropertyToken_PAR7E as `0x${string}`,
          abi: PropertyTokenABI,
          functionName: 'approve',
          args: [addresses.TokenSwapPool as `0x${string}`, BigInt(amount)],
        });

        hash = await writeContractAsync({
          address: addresses.TokenSwapPool as `0x${string}`,
          abi: TokenSwapPoolABI,
          functionName: 'swapTokenForETH',
          args: [BigInt(amount)],
        });
      }

      setResult({
        success: true,
        message: `Swap execute ! Tx: ${hash.slice(0, 10)}...`,
      });
      setAmount('');
      setTimeout(fetchPoolInfo, 3000);
    } catch (error: any) {
      const msg = error?.shortMessage || error?.message || 'Swap echoue';
      setResult({
        success: false,
        message: msg.includes('not KYC')
          ? 'Vous devez etre verifie KYC pour effectuer un swap.'
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Swap & Liquidite"
      subtitle="Echangez des tokens PAR7E contre de l'ETH via le pool AMM on-chain"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowsRightLeftIcon className="h-5 w-5 text-orange" />
              Swap
            </h3>

            {!isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
                Connectez votre wallet pour effectuer des swaps.
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDirection('eth_to_token')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${
                    direction === 'eth_to_token'
                      ? 'bg-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ETH → PAR7E
                </button>
                <button
                  onClick={() => setDirection('token_to_eth')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition ${
                    direction === 'token_to_eth'
                      ? 'bg-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  PAR7E → ETH
                </button>
              </div>

              <Input
                label={direction === 'eth_to_token' ? 'Montant ETH' : 'Nombre de tokens PAR7E'}
                type="number"
                step={direction === 'eth_to_token' ? '0.001' : '1'}
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={direction === 'eth_to_token' ? '0.01' : '10'}
              />

              {quote && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Vous recevrez environ :</p>
                  <p className="text-xl font-bold text-orange">{quote}</p>
                  <p className="text-xs text-gray-400 mt-1">Fee: 0.3% (pool AMM)</p>
                </div>
              )}

              <Button
                onClick={handleSwap}
                loading={loading}
                disabled={!isConnected || !amount || parseFloat(amount) <= 0}
                className="w-full"
                size="lg"
              >
                {loading ? 'Swap en cours...' : 'Executer le swap'}
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
            </div>
          </Card>
        </div>

        {/* Pool Info & Oracle */}
        <div className="space-y-6">
          {/* Pool Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-blue-500" />
              Pool de liquidite
            </h3>
            {poolInfo ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reserve ETH</span>
                  <span className="font-medium">{poolInfo.reserveETHFormatted} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reserve PAR7E</span>
                  <span className="font-medium">{poolInfo.reserveToken} tokens</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Prix spot</span>
                  <span className="font-bold text-orange">{poolInfo.spotPriceETH} ETH/token</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Pool non disponible</p>
            )}
            <button
              onClick={fetchPoolInfo}
              className="mt-3 text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <ArrowPathIcon className="h-3 w-3" /> Actualiser
            </button>
          </Card>

          {/* Oracle Price */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Oracle de prix</h3>
            {oraclePrice ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prix PAR7E</span>
                  <span className="font-bold text-orange">{oraclePrice.priceETH} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confiance</span>
                  <span className="font-medium">{(oraclePrice.confidence / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Derniere MAJ</span>
                  <span className="text-xs text-gray-400">
                    {oraclePrice.updatedAt > 0
                      ? new Date(oraclePrice.updatedAt * 1000).toLocaleString('fr-FR')
                      : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Oracle non disponible</p>
            )}

            {/* Price History */}
            {priceHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">
                  Historique ({priceHistory.length} entrees)
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {priceHistory.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500">
                      <span>{new Date(p.created_at).toLocaleString('fr-FR')}</span>
                      <span>{parseFloat(formatEther(BigInt(p.price_wei))).toFixed(6)} ETH</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
