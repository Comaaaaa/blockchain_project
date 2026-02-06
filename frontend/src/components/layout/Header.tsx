'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Bars3Icon,
  XMarkIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Biens', href: '/properties' },
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'Transactions', href: '/transactions' },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <BuildingOffice2Icon className="h-8 w-8 text-orange" />
            <span className="text-xl font-bold text-blue-dark">
              Token<span className="text-orange">Immo</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-orange/10 text-orange'
                    : 'text-gray-600 hover:text-orange hover:bg-orange/5'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-3">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="avatar"
            />
            {session ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 hover:text-orange transition-colors"
                >
                  Deconnexion
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-2 bg-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-dark transition-colors"
              >
                Connexion
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-2">
            <nav className="flex flex-col space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-orange/10 text-orange'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="mt-3 px-4 space-y-2">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="avatar"
              />
              {!session && (
                <Link
                  href="/auth/signin"
                  className="block text-center px-4 py-2.5 bg-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-dark transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
