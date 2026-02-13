'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, hardhat } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'TokenImmo',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo_project_id',
  chains: [hardhat, sepolia],
  ssr: true,
});
