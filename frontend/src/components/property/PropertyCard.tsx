'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/types';
import { formatCurrency, formatETH, getPropertyTypeLabel, getStatusLabel } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { MapPinIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';

interface PropertyCardProps {
  property: Property;
}

function getStatusVariant(status: string): 'success' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    available: 'success',
    funding: 'warning',
    funded: 'info',
    rented: 'default',
  };
  return map[status] || 'default';
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const funded = property.tokenInfo.totalTokens - property.tokenInfo.availableTokens;

  return (
    <Link href={`/properties/${property.id}`}>
      <Card hover className="h-full flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 left-3">
            <Badge variant={getStatusVariant(property.status)}>
              {getStatusLabel(property.status)}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge>{getPropertyTypeLabel(property.type)}</Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {property.title}
          </h3>
          <div className="flex items-center mt-1 text-sm text-gray-500">
            <MapPinIcon className="h-4 w-4 mr-1" />
            {property.city} ({property.zipCode})
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-orange">
                {formatETH(property.tokenInfo.tokenPrice)}
              </p>
              <p className="text-xs text-gray-500">par token</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-green-600">
                {property.financials.netYield}%
              </p>
              <p className="text-xs text-gray-500">rendement net</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
            <div className="bg-gray-50 rounded-lg p-1.5">
              <p className="font-semibold">{property.surface} m&sup2;</p>
              <p>Surface</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5">
              <p className="font-semibold">{property.rooms}</p>
              <p>Pieces</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5">
              <p className="font-semibold">{formatCurrency(property.price)}</p>
              <p>Prix total</p>
            </div>
          </div>

          <div className="mt-auto pt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <div className="flex items-center">
                <Square3Stack3DIcon className="h-3.5 w-3.5 mr-1" />
                {funded}/{property.tokenInfo.totalTokens} tokens
              </div>
              <span>{property.tokenInfo.availableTokens} disponibles</span>
            </div>
            <ProgressBar
              value={funded}
              max={property.tokenInfo.totalTokens}
              showLabel={false}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
