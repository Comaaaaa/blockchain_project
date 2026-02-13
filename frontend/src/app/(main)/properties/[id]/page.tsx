'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { usePropertyContext } from '@/context/PropertyContext';
import PageContainer from '@/components/layout/PageContainer';
import TokenPurchaseForm from '@/components/property/TokenPurchaseForm';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  formatCurrency,
  formatPercent,
  getPropertyTypeLabel,
  getStatusLabel,
} from '@/lib/utils';
import {
  MapPinIcon,
  CalendarIcon,
  Square3Stack3DIcon,
  ChartBarIcon,
  HomeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = usePropertyContext();
  const property = state.properties.find((p) => p.id === id);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!property) {
    notFound();
  }

  const funded = property.tokenInfo.totalTokens - property.tokenInfo.availableTokens;
  const fundingPercent = (funded / property.tokenInfo.totalTokens) * 100;

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href="/properties"
        className="inline-flex items-center text-sm text-gray-500 hover:text-orange mb-6 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Retour aux biens
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images + Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative h-64 md:h-96 rounded-xl overflow-hidden">
              <Image
                src={property.images[selectedImage]}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge
                  variant={
                    property.status === 'available'
                      ? 'success'
                      : property.status === 'funding'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {getStatusLabel(property.status)}
                </Badge>
                <Badge>{getPropertyTypeLabel(property.type)}</Badge>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {property.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    selectedImage === i ? 'border-orange' : 'border-transparent'
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          </div>

          {/* Title + Location */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{property.title}</h1>
            <div className="flex items-center mt-2 text-gray-500">
              <MapPinIcon className="h-5 w-5 mr-1" />
              <span>
                {property.address}, {property.zipCode} {property.city}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 leading-relaxed">{property.description}</p>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Caracteristiques</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <HomeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{getPropertyTypeLabel(property.type)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Square3Stack3DIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Surface</p>
                  <p className="font-medium">{property.surface} m&sup2;</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pieces</p>
                <p className="font-medium">{property.rooms} pieces ({property.bedrooms} chambres)</p>
              </div>
              {property.floor !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Etage</p>
                  <p className="font-medium">
                    {property.floor === 0 ? 'RDC' : `${property.floor}/${property.totalFloors}`}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Annee</p>
                  <p className="font-medium">{property.yearBuilt}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Prix total</p>
                <p className="font-medium text-orange">{formatCurrency(property.price)}</p>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <ChartBarIcon className="h-5 w-5 inline mr-2" />
              Informations financieres
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Loyer mensuel</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(property.financials.monthlyRent)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loyer annuel</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(property.financials.annualRent)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Charges annuelles</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(property.financials.annualCharges)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rendement brut</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPercent(property.financials.grossYield)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rendement net</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPercent(property.financials.netYield)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Taux d&apos;occupation</p>
                <p className="text-xl font-bold text-gray-900">
                  {property.financials.occupancyRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Token Info + Purchase */}
        <div className="space-y-6">
          {/* Token Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Token</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Symbole</span>
                <span className="font-mono font-semibold text-orange">
                  ${property.tokenInfo.tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Blockchain</span>
                <span className="font-medium">{property.tokenInfo.blockchain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prix par token</span>
                <span className="font-bold text-xl text-orange">
                  {formatCurrency(property.tokenInfo.tokenPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total tokens</span>
                <span className="font-medium">{property.tokenInfo.totalTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tokens disponibles</span>
                <span className="font-medium text-green-600">
                  {property.tokenInfo.availableTokens}
                </span>
              </div>
            </div>

            <ProgressBar value={funded} max={property.tokenInfo.totalTokens} color="orange" />
            <p className="text-xs text-gray-500 mt-1 text-center">
              {funded} / {property.tokenInfo.totalTokens} tokens vendus ({fundingPercent.toFixed(0)}%)
            </p>

            <div className="mt-6">
              <TokenPurchaseForm property={property} />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
