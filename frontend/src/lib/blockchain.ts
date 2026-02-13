/**
 * Blockchain interaction layer — calls the backend API for on-chain operations.
 * The backend handles the actual smart contract interactions.
 */

import { api } from './api';

export interface BlockchainResult {
  success: boolean;
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export async function getComplianceStatus(address: string) {
  return api.getComplianceStatus(address);
}

export async function getTokenInfo(propertyId: string) {
  return api.getPropertyTokenInfo(propertyId);
}

export async function getPoolInfo() {
  return api.getPoolInfo();
}

export async function getSwapQuote(direction: 'eth_to_token' | 'token_to_eth', amount: string) {
  return api.getSwapQuote(direction, amount);
}

export async function getOraclePrice(tokenAddress: string) {
  return api.getOraclePrice(tokenAddress);
}

export async function getOraclePriceHistory(tokenAddress: string, limit?: number) {
  return api.getPriceHistory(tokenAddress, limit);
}
