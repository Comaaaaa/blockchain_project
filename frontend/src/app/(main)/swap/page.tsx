'use client';

import { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { api } from '@/lib/api';
import {
  TokenSwapPoolABI,
  PropertyTokenABI,
  UniswapV2RouterABI,
  getContractAddresses,
} from '@/lib/contracts';
import { useTransactionContext } from '@/context/TransactionContext';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { addTransaction } = useTransactionContext();
  const addresses = getContractAddresses();

  const [dex, setDex] = useState<'pool' | 'uniswap' | 'sushiswap'>('pool');
  const [direction, setDirection] = useState<'eth_to_token' | 'token_to_eth'>('eth_to_token');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [dexPairInfo, setDexPairInfo] = useState<any>(null);
  const [oraclePrice, setOraclePrice] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const rawTokenDecimals = (dex === 'pool' ? poolInfo?.tokenDecimals : dexPairInfo?.tokenDecimals);
  const tokenDecimalsParsed = Number(rawTokenDecimals ?? 0);
  const tokenDecimals =
    Number.isFinite(tokenDecimalsParsed) && tokenDecimalsParsed >= 0 && tokenDecimalsParsed <= 18
      ? tokenDecimalsParsed
      : 0;

  const formatEthValue = (value: string | number | bigint, maximumFractionDigits = 6) => {
    try {
      const numeric = Number(typeof value === 'bigint' ? formatEther(value) : value);
      if (!Number.isFinite(numeric)) return '0';
      return numeric.toLocaleString('fr-FR', { maximumFractionDigits });
    } catch {
      return '0';
    }
  };

  const formatTokenValue = (value: string | number | bigint) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    return numeric.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  };

  const fetchPoolInfo = async () => {
    try {
      if (dex === 'pool') {
        const info = await api.getPoolInfo();
        setPoolInfo(info);
      } else {
        const info = await api.getDexPairInfo(dex === 'uniswap' ? 'uniswap' : 'sushiswap');
        setDexPairInfo(info);
      }
    } catch {
      // DEX may not be configured/deployed
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
  }, [dex]);

  const getQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      const q =
        dex === 'pool'
          ? await api.getSwapQuote(direction, amount)
          : await api.getDexQuote(dex === 'uniswap' ? 'uniswap' : 'sushiswap', direction, amount);
      if (direction === 'eth_to_token') {
        const tokenOutValue = q.tokenOutFormatted ?? q.tokenOut;
        setQuote(`${formatTokenValue(tokenOutValue)} PAR7E`);
      } else {
        setQuote(`${formatEthValue(q.ethOutFormatted, 8)} ETH`);
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
  }, [amount, direction, dex]);

  const handleSwap = async () => {
    if (!isConnected || !amount) return;
    setLoading(true);
    setResult(null);

    try {
      let hash: string;
      let totalAmountWei = '0';
      let swapTokens = 0;
      const propertyTokenAddress = addresses.PropertyToken_PAR7E as `0x${string}`;
      const wethAddress = addresses.WETH as `0x${string}`;

      if (direction === 'eth_to_token') {
        totalAmountWei = parseEther(amount).toString();
        if (dex === 'pool') {
          const q = await api.getSwapQuote('eth_to_token', amount);
          swapTokens = Number(q.tokenOutFormatted || 0);
          hash = await writeContractAsync({
            address: addresses.TokenSwapPool as `0x${string}`,
            abi: TokenSwapPoolABI,
            functionName: 'swapETHForToken',
            value: parseEther(amount),
          });
        } else {
          const q = await api.getDexQuote(
            dex === 'uniswap' ? 'uniswap' : 'sushiswap',
            'eth_to_token',
            amount
          );
          swapTokens = Number(q.tokenOutFormatted || 0);
          const outMin = (BigInt(q.tokenOut) * BigInt(98)) / BigInt(100);
          const routerAddress =
            dex === 'uniswap' ? addresses.UniswapV2Router : addresses.SushiswapV2Router;
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

          hash = await writeContractAsync({
            address: routerAddress as `0x${string}`,
            abi: UniswapV2RouterABI,
            functionName: 'swapExactETHForTokens',
            args: [outMin, [wethAddress, propertyTokenAddress], address as `0x${string}`, deadline],
            value: parseEther(amount),
          });
        }
      } else {
        const tokenInWei = parseUnits(amount, tokenDecimals);
        swapTokens = Number(formatUnits(tokenInWei, tokenDecimals));
        const spender =
          dex === 'pool'
            ? addresses.TokenSwapPool
            : dex === 'uniswap'
              ? addresses.UniswapV2Router
              : addresses.SushiswapV2Router;

        // Approve first
        await writeContractAsync({
          address: propertyTokenAddress,
          abi: PropertyTokenABI,
          functionName: 'approve',
          args: [spender as `0x${string}`, tokenInWei],
        });

        if (dex === 'pool') {
          const q = await api.getSwapQuote('token_to_eth', amount);
          totalAmountWei = q.ethOut ? String(q.ethOut) : '0';

          hash = await writeContractAsync({
            address: addresses.TokenSwapPool as `0x${string}`,
            abi: TokenSwapPoolABI,
            functionName: 'swapTokenForETH',
            args: [tokenInWei],
          });
        } else {
          const q = await api.getDexQuote(
            dex === 'uniswap' ? 'uniswap' : 'sushiswap',
            'token_to_eth',
            amount
          );
          totalAmountWei = q.ethOut ? String(q.ethOut) : '0';
          const outMin = (BigInt(q.ethOut) * BigInt(98)) / BigInt(100);
          const routerAddress =
            dex === 'uniswap' ? addresses.UniswapV2Router : addresses.SushiswapV2Router;
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);

          hash = await writeContractAsync({
            address: routerAddress as `0x${string}`,
            abi: UniswapV2RouterABI,
            functionName: 'swapExactTokensForETH',
            args: [
              tokenInWei,
              outMin,
              [propertyTokenAddress, wethAddress],
              address as `0x${string}`,
              deadline,
            ],
          });
        }
      }

      // Record swap transaction (persisted to backend)
      addTransaction({
        id: uuidv4(),
        type: 'swap',
        propertyId: 'prop-001',
        propertyTitle:
          (direction === 'eth_to_token' ? 'ETH → PAR7E' : 'PAR7E → ETH') +
          (dex === 'pool' ? ' (Pool)' : dex === 'uniswap' ? ' (Uniswap)' : ' (Sushiswap)'),
        from: direction === 'eth_to_token' ? address! : address!,
        to: direction === 'eth_to_token' ? address! : address!,
        swapDirection: direction,
        tokens:
          Number.isFinite(swapTokens)
            ? direction === 'eth_to_token'
              ? swapTokens
              : -swapTokens
            : 0,
        pricePerToken: 0,
        totalAmount: Number(formatEther(BigInt(totalAmountWei))),
        totalAmountWei,
        txHash: hash,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      });

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
      subtitle="Echangez des tokens PAR7E contre de l'ETH via le pool interne ou un DEX"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowsRightLeftIcon className="h-5 w-5 text-orange" />
              Swap
            </h3>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setDex('pool')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                  dex === 'pool' ? 'bg-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pool interne
              </button>
              <button
                onClick={() => setDex('uniswap')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                  dex === 'uniswap' ? 'bg-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Uniswap V2
              </button>
              <button
                onClick={() => setDex('sushiswap')}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                  dex === 'sushiswap' ? 'bg-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sushiswap V2
              </button>
            </div>

            {dex !== 'pool' && (!dexPairInfo || !dexPairInfo.configured || !dexPairInfo.pairExists) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
                {dexPairInfo?.configured
                  ? 'Pair non creee pour ce DEX. Ajoutez la liquidite d abord.'
                  : 'DEX non configure. Verifiez les variables d environnement.'}
              </div>
            )}

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
                step={direction === 'eth_to_token' ? '0.001' : tokenDecimals > 0 ? '0.0001' : '1'}
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={direction === 'eth_to_token' ? '0.01' : '10'}
              />

              {quote && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Vous recevrez environ :</p>
                  <p className="text-xl font-bold text-orange">{quote}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Frais estimes: 0.3% ({dex === 'pool' ? 'pool interne' : 'DEX V2'})
                    </p>
                </div>
              )}

              <Button
                onClick={handleSwap}
                loading={loading}
                disabled={
                  !isConnected ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  (dex !== 'pool' && (!dexPairInfo || !dexPairInfo.configured || !dexPairInfo.pairExists))
                }
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
              {dex === 'pool' ? 'Pool de liquidite' : `Liquidite ${dex === 'uniswap' ? 'Uniswap V2' : 'Sushiswap V2'}`}
            </h3>
            {dex === 'pool' && poolInfo ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reserve ETH</span>
                  <span className="font-medium">{formatEthValue(poolInfo.reserveETHFormatted)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reserve PAR7E</span>
                  <span className="font-medium">{formatTokenValue(poolInfo.reserveTokenFormatted)} tokens</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Prix spot</span>
                  <span className="font-bold text-orange">{formatEthValue(poolInfo.spotPriceETH, 8)} ETH / PAR7E</span>
                </div>
              </div>
            ) : dex !== 'pool' && dexPairInfo?.configured && dexPairInfo?.pairExists ? (
              (() => {
                const reserveEthNum = Number(dexPairInfo.reserveETHFormatted || '0');
                const reserveTokenNum = Number(dexPairInfo.reserveTokenFormatted || '0');
                const spot =
                  Number.isFinite(reserveEthNum) && Number.isFinite(reserveTokenNum) && reserveTokenNum > 0
                    ? reserveEthNum / reserveTokenNum
                    : 0;

                return (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reserve ETH</span>
                      <span className="font-medium">{formatEthValue(reserveEthNum)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reserve PAR7E</span>
                      <span className="font-medium">{formatTokenValue(reserveTokenNum)} tokens</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Prix spot</span>
                      <span className="font-bold text-orange">{formatEthValue(spot, 8)} ETH / PAR7E</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-gray-400 text-sm">
                {dex === 'pool' ? 'Pool non disponible' : 'Infos de paire DEX non disponibles'}
              </p>
            )}

            {dex !== 'pool' && dexPairInfo?.pairExists && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                Pair {dexPairInfo.dex}: {dexPairInfo.pairAddress}
              </div>
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
                  <span className="font-bold text-orange">{formatEthValue(oraclePrice.priceETH, 8)} ETH</span>
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
                  Historique ({Math.min(priceHistory.length, 10)} entrees)
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
