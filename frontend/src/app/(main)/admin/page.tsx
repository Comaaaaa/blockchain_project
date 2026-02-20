'use client';

import { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { shortenAddress } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  NoSymbolIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ComplianceUser {
  id: string;
  wallet_address: string;
  name: string;
  is_whitelisted: number;
  is_blacklisted: number;
  kyc_timestamp: string;
  created_at: string;
}

interface AssetRequest {
  id: string;
  owner_address: string;
  title: string;
  asset_type: string;
  location?: string;
  valuation_eur?: number;
  status: string;
  tx_hash?: string;
  nft_token_id?: number;
  created_at: string;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [users, setUsers] = useState<ComplianceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressInput, setAddressInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Mint NFT states
  const [mintTo, setMintTo] = useState('');
  const [mintUri, setMintUri] = useState('');
  const [mintAssetType, setMintAssetType] = useState('property_deed');
  const [mintLocation, setMintLocation] = useState('');
  const [mintValuation, setMintValuation] = useState('');
  const [mintLoading, setMintLoading] = useState(false);
  const [mintResult, setMintResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check current wallet compliance
  const [walletStatus, setWalletStatus] = useState<any>(null);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);

  const fetchUsers = async () => {
    try {
      const data = await api.getComplianceUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetRequests = async () => {
    try {
      const data = await api.getAssetRequests();
      setAssetRequests(data);
    } catch {
      setAssetRequests([]);
    }
  };

  const checkWalletStatus = async () => {
    if (!address) return;
    try {
      const status = await api.getComplianceStatus(address);
      setWalletStatus(status);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    checkWalletStatus();
    fetchAssetRequests();
  }, [address]);

  const handleApproveRequest = async (requestId: string) => {
    if (!address) return;
    setActionLoading(`approve-${requestId}`);
    try {
      await api.approveAssetRequest(requestId, address);
      await fetchAssetRequests();
      setResult({ success: true, message: 'Demande approuvee.' });
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Erreur lors de la validation.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!address) return;
    setActionLoading(`reject-${requestId}`);
    try {
      await api.rejectAssetRequest(requestId, address);
      await fetchAssetRequests();
      setResult({ success: true, message: 'Demande rejetee.' });
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Erreur lors du rejet.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTokenizeRequest = async (requestId: string) => {
    if (!address) return;
    setActionLoading(`tokenize-${requestId}`);
    try {
      await api.tokenizeAssetRequest(requestId, address);
      await fetchAssetRequests();
      setResult({ success: true, message: 'Tokenisation effectuee on-chain.' });
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Erreur lors de la tokenisation.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleWhitelist = async () => {
    if (!addressInput) return;
    setActionLoading('whitelist');
    setResult(null);
    try {
      const res = await api.whitelistAddress(addressInput);
      setResult({ success: true, message: `Adresse whitelistee ! Tx: ${res.txHash?.slice(0, 10)}...` });
      setAddressInput('');
      fetchUsers();
      checkWalletStatus();
    } catch (error: any) {
      setResult({ success: false, message: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlacklist = async () => {
    if (!addressInput) return;
    setActionLoading('blacklist');
    setResult(null);
    try {
      const res = await api.blacklistAddress(addressInput);
      setResult({ success: true, message: `Adresse blacklistee ! Tx: ${res.txHash?.slice(0, 10)}...` });
      setAddressInput('');
      fetchUsers();
      checkWalletStatus();
    } catch (error: any) {
      setResult({ success: false, message: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveWhitelist = async (addr: string) => {
    setActionLoading(addr);
    try {
      await api.removeFromWhitelist(addr);
      fetchUsers();
      checkWalletStatus();
    } catch (error: any) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveBlacklist = async (addr: string) => {
    setActionLoading(addr);
    try {
      await api.removeFromBlacklist(addr);
      fetchUsers();
      checkWalletStatus();
    } catch (error: any) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMintNFT = async () => {
    if (!mintTo || !mintUri || !mintLocation || !mintValuation) return;
    setMintLoading(true);
    setMintResult(null);
    try {
      const valuationWei = parseEther(mintValuation).toString();
      const res = await api.mintNFT({
        to: mintTo,
        uri: mintUri,
        assetType: mintAssetType,
        location: mintLocation,
        valuationWei: valuationWei,
      });
      setMintResult({
        success: true,
        message: `NFT minte avec succes ! Token ID: ${res.tokenId ?? res.token_id}`,
      });
      setMintTo('');
      setMintUri('');
      setMintAssetType('property_deed');
      setMintLocation('');
      setMintValuation('');
    } catch (error: any) {
      setMintResult({ success: false, message: error.message });
    } finally {
      setMintLoading(false);
    }
  };

  return (
    <PageContainer
      title="Administration KYC"
      subtitle="Gestion de la conformite : whitelist et blacklist on-chain"
    >
      {/* Current wallet status */}
      {isConnected && walletStatus && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Statut de votre wallet</h3>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600 font-mono">{address}</p>
            {walletStatus.isCompliant ? (
              <Badge variant="success">
                <ShieldCheckIcon className="h-4 w-4 mr-1" /> KYC Verifie
              </Badge>
            ) : walletStatus.isBlacklisted ? (
              <Badge variant="danger">
                <NoSymbolIcon className="h-4 w-4 mr-1" /> Blackliste
              </Badge>
            ) : (
              <Badge variant="warning">
                <ShieldExclamationIcon className="h-4 w-4 mr-1" /> Non verifie
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Add to whitelist / blacklist */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Gerer une adresse</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="0x... adresse Ethereum"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />
          </div>
          <Button
            onClick={handleWhitelist}
            loading={actionLoading === 'whitelist'}
            disabled={!addressInput}
            className="whitespace-nowrap"
          >
            <UserPlusIcon className="h-5 w-5 mr-1" />
            Whitelist (KYC)
          </Button>
          <Button
            onClick={handleBlacklist}
            loading={actionLoading === 'blacklist'}
            disabled={!addressInput}
            variant="outline"
            className="whitespace-nowrap text-red-600 border-red-300 hover:!bg-red-50"
          >
            <NoSymbolIcon className="h-5 w-5 mr-1" />
            Blacklist
          </Button>
        </div>

        {result && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {result.message}
          </div>
        )}
      </Card>

      {/* Users list */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Utilisateurs enregistres</h3>
          <Button variant="outline" onClick={fetchUsers} size="sm">
            <ArrowPathIcon className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Chargement...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun utilisateur enregistre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Adresse</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Statut</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">KYC Date</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.wallet_address} className="border-b border-gray-100">
                    <td className="py-3 px-2 font-mono text-xs">
                      {shortenAddress(user.wallet_address, 8)}
                    </td>
                    <td className="py-3 px-2">
                      {user.is_blacklisted ? (
                        <Badge variant="danger">Blackliste</Badge>
                      ) : user.is_whitelisted ? (
                        <Badge variant="success">Whitelist</Badge>
                      ) : (
                        <Badge variant="warning">Non verifie</Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-500">
                      {user.kyc_timestamp || '-'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-2">
                        {user.is_whitelisted ? (
                          <button
                            onClick={() => handleRemoveWhitelist(user.wallet_address)}
                            disabled={actionLoading === user.wallet_address}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Retirer whitelist
                          </button>
                        ) : null}
                        {user.is_blacklisted ? (
                          <button
                            onClick={() => handleRemoveBlacklist(user.wallet_address)}
                            disabled={actionLoading === user.wallet_address}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Retirer blacklist
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Asset tokenization requests */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Demandes de tokenisation</h3>
          <Button variant="outline" onClick={fetchAssetRequests} size="sm">
            <ArrowPathIcon className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </div>

        {assetRequests.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune demande pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {assetRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{request.title}</p>
                    <p className="text-xs text-gray-500">
                      {shortenAddress(request.owner_address, 8)} • {request.location || '—'}
                    </p>
                  </div>
                  <Badge variant={request.status === 'tokenized' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'}>
                    {request.status}
                  </Badge>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request.id)}
                        loading={actionLoading === `approve-${request.id}`}
                      >
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        loading={actionLoading === `reject-${request.id}`}
                      >
                        Rejeter
                      </Button>
                    </>
                  )}

                  {request.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleTokenizeRequest(request.id)}
                      loading={actionLoading === `tokenize-${request.id}`}
                    >
                      Tokenizer (mint NFT)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {/* Mint NFT */}
      <Card className="p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-orange" />
          Minter un NFT (TIMMO)
        </h3>
        <div className="space-y-3">
          <Input
            placeholder="0x... adresse destinataire"
            value={mintTo}
            onChange={(e) => setMintTo(e.target.value)}
          />
          <Input
            placeholder="Token URI (ex: ipfs://...)"
            value={mintUri}
            onChange={(e) => setMintUri(e.target.value)}
          />
          <Select
            label="Type d'actif"
            value={mintAssetType}
            onChange={(e) => setMintAssetType(e.target.value)}
            options={[
              { value: 'property_deed', label: 'Titre de propriete' },
              { value: 'artwork', label: "Oeuvre d'art" },
              { value: 'collectible', label: 'Objet de collection' },
            ]}
          />
          <Input
            placeholder="Localisation (ex: Paris 8e)"
            value={mintLocation}
            onChange={(e) => setMintLocation(e.target.value)}
          />
          <Input
            placeholder="Valorisation en ETH (ex: 1.5)"
            value={mintValuation}
            onChange={(e) => setMintValuation(e.target.value)}
            type="number"
            step="0.0001"
            min="0"
          />
          <Button
            onClick={handleMintNFT}
            loading={mintLoading}
            disabled={!mintTo || !mintUri || !mintLocation || !mintValuation}
            className="w-full"
          >
            <SparklesIcon className="h-5 w-5 mr-1" />
            Minter le NFT
          </Button>
        </div>

        {mintResult && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              mintResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {mintResult.message}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
