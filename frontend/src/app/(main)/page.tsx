'use client';

import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PropertyCard from '@/components/property/PropertyCard';
import { properties, featuredPropertyIds } from '@/data/properties';
import {
  BuildingOffice2Icon,
  CurrencyEuroIcon,
  ShieldCheckIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';

const featuredProperties = properties.filter((p) => featuredPropertyIds.includes(p.id));

const stats = {
  totalProperties: properties.length,
  totalInvestors: 2847,
  totalTokenized: properties.reduce((sum, p) => sum + p.price, 0),
  averageYield:
    properties.reduce((sum, p) => sum + p.financials.netYield, 0) / properties.length,
};

const steps = [
  {
    icon: BuildingOffice2Icon,
    title: 'Choisissez un bien',
    description:
      'Parcourez notre selection de biens immobiliers verifies et analyses par nos experts.',
  },
  {
    icon: Square3Stack3DIcon,
    title: 'Achetez des tokens',
    description:
      'Investissez a partir de quelques euros en achetant des tokens representant une part du bien.',
  },
  {
    icon: CurrencyEuroIcon,
    title: 'Percevez des revenus',
    description:
      'Recevez automatiquement votre part des loyers proportionnelle a vos tokens detenus.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-blue-dark text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              L&apos;immobilier accessible
              <span className="text-orange"> a tous</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300">
              Investissez dans l&apos;immobilier francais a partir de quelques euros grace a la
              tokenisation sur blockchain. Percevez des revenus locatifs proportionnels.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/properties">
                <Button size="lg">Voir les biens disponibles</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-dark">
                  Creer un compte
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
              <ShieldCheckIcon className="h-5 w-5" />
              <span>Blockchain Ethereum Sepolia - Projet educatif</span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-orange">{stats.totalProperties}</p>
              <p className="text-sm text-gray-500 mt-1">Biens disponibles</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange">
                {stats.totalInvestors.toLocaleString('fr-FR')}
              </p>
              <p className="text-sm text-gray-500 mt-1">Investisseurs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange">
                {formatCurrency(stats.totalTokenized)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Tokenises</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange">
                {stats.averageYield.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Rendement moyen</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Comment ca marche ?</h2>
          <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
            Investir dans l&apos;immobilier tokenise en 3 etapes simples
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={step.title} className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-orange/10 rounded-2xl flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-orange" />
                </div>
              </div>
              <div className="text-sm font-semibold text-orange mb-2">Etape {index + 1}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Biens a la une</h2>
              <p className="mt-2 text-gray-500">
                Notre selection des meilleures opportunites d&apos;investissement
              </p>
            </div>
            <Link href="/properties">
              <Button variant="outline">Voir tous les biens</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Pret a investir dans l&apos;immobilier ?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Rejoignez des milliers d&apos;investisseurs et diversifiez votre patrimoine grace a
            la tokenisation immobiliere.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/properties">
              <Button
                size="lg"
                className="bg-white text-orange hover:bg-gray-100"
              >
                Explorer les biens
              </Button>
            </Link>
            <Link href="/properties/new">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-orange"
              >
                Proposer un bien
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
