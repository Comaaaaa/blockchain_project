import Link from 'next/link';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function Footer() {
  return (
    <footer className="bg-blue-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <BuildingOffice2Icon className="h-8 w-8 text-orange" />
              <span className="text-xl font-bold">
                Token<span className="text-orange">Immo</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              La premiere plateforme francaise de tokenisation immobiliere. Investissez dans
              l&apos;immobilier a partir de quelques euros grace a la blockchain.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Plateforme
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/properties" className="text-gray-300 hover:text-orange text-sm transition-colors">
                  Biens disponibles
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-gray-300 hover:text-orange text-sm transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-gray-300 hover:text-orange text-sm transition-colors">
                  Mon portfolio
                </Link>
              </li>
              <li>
                <Link href="/properties/new" className="text-gray-300 hover:text-orange text-sm transition-colors">
                  Proposer un bien
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Informations
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-gray-300 text-sm">Comment ca marche</span>
              </li>
              <li>
                <span className="text-gray-300 text-sm">FAQ</span>
              </li>
              <li>
                <span className="text-gray-300 text-sm">Mentions legales</span>
              </li>
              <li>
                <span className="text-gray-300 text-sm">CGU</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Contact
            </h3>
            <ul className="space-y-2">
              <li className="text-gray-300 text-sm">contact@tokenimmo.fr</li>
              <li className="text-gray-300 text-sm">01 23 45 67 89</li>
              <li className="text-gray-300 text-sm">Paris, France</li>
            </ul>
            <div className="mt-4">
              <span className="text-xs text-gray-500">
                Blockchain: Ethereum Sepolia (Testnet)
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} TokenImmo. Tous droits reserves. Projet educatif -
            Aucun investissement reel.
          </p>
        </div>
      </div>
    </footer>
  );
}
