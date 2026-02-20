'use client';

import { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAccount } from 'wagmi';

const steps = ['Informations generales', 'Caracteristiques', 'Tokenisation', 'Confirmation'];

const typeOptions = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'house', label: 'Maison' },
  { value: 'commercial', label: 'Local commercial' },
  { value: 'land', label: 'Terrain' },
];

export default function NewPropertyPage() {
  const { address } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    zipCode: '',
    type: 'apartment',
    price: 0,
    surface: 0,
    rooms: 1,
    bedrooms: 1,
    yearBuilt: 2000,
    totalTokens: 1000,
    tokenPrice: 0,
    annualRent: 0,
    annualCharges: 0,
  });

  const updateForm = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const netYield =
    form.price > 0
      ? (((form.annualRent - form.annualCharges) / form.price) * 100).toFixed(2)
      : '0.00';

  const fetchMyRequests = async () => {
    if (!address) {
      setRequests([]);
      return;
    }
    try {
      const data = await api.getAssetRequests({ owner: address.toLowerCase() });
      setRequests(data);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [address]);

  const handleSubmit = async () => {
    if (!address) {
      setResult({ success: false, message: 'Connectez votre wallet pour soumettre une demande.' });
      return;
    }

    setLoading(true);

    try {
      await api.createAssetRequest({
        owner_address: address,
        title: form.title,
        asset_type: 'property_deed',
        location: `${form.address}, ${form.zipCode} ${form.city}`,
        valuation_eur: form.price,
        token_uri: `ipfs://QmTokenImmo/request-${Date.now()}`,
      });

      setResult({ success: true, message: 'Demande envoyee. Un admin doit la valider avant tokenisation.' });
      await fetchMyRequests();
      setCurrentStep(0);
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message
          : undefined;
      setResult({ success: false, message: message || 'Erreur lors de l\'envoi de la demande.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Proposer un bien"
      subtitle="Tokenisez votre bien immobilier et ouvrez-le aux investisseurs"
    >
      {/* Steps indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index <= currentStep
                    ? 'bg-orange text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:block ${
                  index <= currentStep ? 'text-orange font-medium' : 'text-gray-400'
                }`}
              >
                {step}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-orange' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="max-w-2xl mx-auto p-6">
        {/* Step 1: General Info */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations generales</h2>
            <Input
              label="Titre du bien"
              placeholder="Ex: Appartement T3 - Paris 7e"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Adresse"
                placeholder="24 Rue de Grenelle"
                value={form.address}
                onChange={(e) => updateForm('address', e.target.value)}
              />
              <Input
                label="Ville"
                placeholder="Paris"
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Code postal"
                placeholder="75007"
                value={form.zipCode}
                onChange={(e) => updateForm('zipCode', e.target.value)}
              />
              <Select
                label="Type de bien"
                options={typeOptions}
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                rows={4}
                placeholder="Decrivez le bien en detail..."
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Caracteristiques</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prix du bien (EUR)"
                type="number"
                value={form.price || ''}
                onChange={(e) => updateForm('price', parseInt(e.target.value) || 0)}
              />
              <Input
                label="Surface (m2)"
                type="number"
                value={form.surface || ''}
                onChange={(e) => updateForm('surface', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Pieces"
                type="number"
                min={1}
                value={form.rooms}
                onChange={(e) => updateForm('rooms', parseInt(e.target.value) || 1)}
              />
              <Input
                label="Chambres"
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => updateForm('bedrooms', parseInt(e.target.value) || 0)}
              />
              <Input
                label="Annee de construction"
                type="number"
                value={form.yearBuilt}
                onChange={(e) => updateForm('yearBuilt', parseInt(e.target.value) || 2000)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Tokenization */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tokenisation & Rendement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre total de tokens"
                type="number"
                min={100}
                value={form.totalTokens}
                onChange={(e) => updateForm('totalTokens', parseInt(e.target.value) || 100)}
              />
              <Input
                label="Prix par token (EUR)"
                type="number"
                value={form.tokenPrice || Math.round(form.price / form.totalTokens) || ''}
                onChange={(e) => updateForm('tokenPrice', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Loyer annuel (EUR)"
                type="number"
                value={form.annualRent || ''}
                onChange={(e) => updateForm('annualRent', parseInt(e.target.value) || 0)}
              />
              <Input
                label="Charges annuelles (EUR)"
                type="number"
                value={form.annualCharges || ''}
                onChange={(e) => updateForm('annualCharges', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="bg-orange/5 rounded-lg p-4 border border-orange/20">
              <p className="text-sm text-gray-600">
                Rendement net estime:{' '}
                <span className="text-xl font-bold text-orange">{netYield}%</span>
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recapitulatif</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Titre</span>
                <span className="font-medium">{form.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Localisation</span>
                <span className="font-medium">
                  {form.address}, {form.zipCode} {form.city}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prix</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(form.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Surface</span>
                <span className="font-medium">{form.surface} m&sup2;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tokens</span>
                <span className="font-medium">{form.totalTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prix/token</span>
                <span className="font-medium text-orange">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(form.tokenPrice || Math.round(form.price / form.totalTokens))}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-500">Rendement net</span>
                <span className="font-bold text-green-600">{netYield}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              En soumettant ce bien, vous acceptez les conditions de tokenisation. Le bien sera
              verifie par notre equipe avant publication.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Precedent
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>Suivant</Button>
          ) : (
            <Button onClick={handleSubmit} loading={loading}>
              Soumettre le bien
            </Button>
          )}
        </div>
      </Card>

      <Card className="max-w-2xl mx-auto p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Mes demandes de tokenisation</h3>

        {result && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {result.message}
          </div>
        )}

        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune demande pour ce wallet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{request.title}</span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{request.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{request.location || '—'}</p>
                {request.tx_hash && (
                  <p className="text-xs text-gray-500 mt-1">Tx: {String(request.tx_hash).slice(0, 12)}...</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
