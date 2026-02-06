'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { SessionProvider } from 'next-auth/react';
import { wagmiConfig } from '@/config/wagmi';
import { PropertyProvider } from '@/context/PropertyContext';
import { PortfolioProvider } from '@/context/PortfolioContext';
import { TransactionProvider } from '@/context/TransactionContext';
import { MarketplaceProvider } from '@/context/MarketplaceContext';
import '@rainbow-me/rainbowkit/styles.css';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#E8560F',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          <SessionProvider>
            <PropertyProvider>
              <PortfolioProvider>
                <TransactionProvider>
                  <MarketplaceProvider>{children}</MarketplaceProvider>
                </TransactionProvider>
              </PortfolioProvider>
            </PropertyProvider>
          </SessionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
