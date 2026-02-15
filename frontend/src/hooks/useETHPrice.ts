'use client';

import { useState, useEffect } from 'react';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur';
const CACHE_KEY = 'eth_eur_price';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FALLBACK_PRICE = 2500; // Fallback if API unavailable

interface CachedPrice {
  price: number;
  timestamp: number;
}

function getCachedPrice(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedPrice = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.price;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getCurrentETHPriceEUR(): number {
  return getCachedPrice() || FALLBACK_PRICE;
}

function setCachedPrice(price: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ price, timestamp: Date.now() }));
  } catch {
    // ignore
  }
}

export function useETHPrice(): { ethPrice: number; loading: boolean } {
  const cachedOnInit = getCachedPrice();
  const [ethPrice, setEthPrice] = useState<number>(() => cachedOnInit || FALLBACK_PRICE);
  const [loading, setLoading] = useState(!cachedOnInit);

  useEffect(() => {
    const cached = getCachedPrice();
    if (cached) {
      return;
    }

    let cancelled = false;
    fetch(COINGECKO_URL)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ethereum?.eur) {
          const price = data.ethereum.eur;
          setEthPrice(price);
          setCachedPrice(price);
        }
      })
      .catch(() => {
        // Keep fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { ethPrice, loading };
}

/** Convert a wei amount to EUR using the given ETH/EUR rate */
export function weiToEUR(wei: string | number | bigint, ethPriceEUR: number): number {
  const weiBig = BigInt(wei);
  // Scale: EUR = (wei * ethPriceEUR) / 1e18
  // Use integer math: multiply by ethPrice*100 (cents), divide by 1e18, then /100
  const cents = weiBig * BigInt(Math.round(ethPriceEUR * 100)) / (BigInt(10) ** BigInt(18));
  return Number(cents) / 100;
}

/** Format a wei amount as EUR string */
export function formatWeiAsEUR(wei: string | number | bigint, ethPriceEUR: number): string {
  const eur = weiToEUR(wei, ethPriceEUR);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: eur < 10 ? 2 : 0,
    maximumFractionDigits: eur < 10 ? 2 : 0,
  }).format(eur);
}
