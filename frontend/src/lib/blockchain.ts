import { generateTxHash, generateBlockNumber } from './utils';

const SIMULATED_DELAY_MIN = 2000;
const SIMULATED_DELAY_MAX = 3000;
const FAILURE_RATE = 0.05;

function getRandomDelay(): number {
  return Math.floor(Math.random() * (SIMULATED_DELAY_MAX - SIMULATED_DELAY_MIN + 1)) + SIMULATED_DELAY_MIN;
}

function shouldFail(): boolean {
  return Math.random() < FAILURE_RATE;
}

export interface BlockchainResult {
  success: boolean;
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export async function simulateTokenPurchase(
  propertyId: string,
  tokens: number,
  pricePerToken: number
): Promise<BlockchainResult> {
  await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

  if (shouldFail()) {
    return {
      success: false,
      txHash: generateTxHash(),
      error: 'Transaction reverted: insufficient gas or network congestion',
    };
  }

  return {
    success: true,
    txHash: generateTxHash(),
    blockNumber: generateBlockNumber(),
    gasUsed: (0.003 + Math.random() * 0.004).toFixed(4),
  };
}

export async function simulateTokenSale(
  propertyId: string,
  tokens: number,
  pricePerToken: number
): Promise<BlockchainResult> {
  await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

  if (shouldFail()) {
    return {
      success: false,
      txHash: generateTxHash(),
      error: 'Transaction reverted: marketplace approval not set',
    };
  }

  return {
    success: true,
    txHash: generateTxHash(),
    blockNumber: generateBlockNumber(),
    gasUsed: (0.004 + Math.random() * 0.005).toFixed(4),
  };
}

export async function simulateCreateListing(
  propertyId: string,
  tokens: number,
  pricePerToken: number
): Promise<BlockchainResult> {
  await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

  if (shouldFail()) {
    return {
      success: false,
      txHash: generateTxHash(),
      error: 'Transaction reverted: token balance too low',
    };
  }

  return {
    success: true,
    txHash: generateTxHash(),
    blockNumber: generateBlockNumber(),
    gasUsed: (0.005 + Math.random() * 0.003).toFixed(4),
  };
}

export async function simulateBuyFromListing(
  listingId: string,
  tokens: number
): Promise<BlockchainResult> {
  await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

  if (shouldFail()) {
    return {
      success: false,
      txHash: generateTxHash(),
      error: 'Transaction reverted: listing expired or cancelled',
    };
  }

  return {
    success: true,
    txHash: generateTxHash(),
    blockNumber: generateBlockNumber(),
    gasUsed: (0.006 + Math.random() * 0.004).toFixed(4),
  };
}
