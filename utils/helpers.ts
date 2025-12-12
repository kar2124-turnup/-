

import { BASE_PRICE_PER_SESSION } from '../constants';

export const nowISO = () => new Date().toISOString();

export const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export function daysUntil(endISO: string): number {
  const end = new Date(endISO).getTime();
  const diff = end - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const calcPackPublicPrice = (count: number) => BASE_PRICE_PER_SESSION * count;

export function calcFinalPrice(listPrice: number, discountPercent: number): number {
  const lp = Number(listPrice) || 0;
  const dp = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
  return Math.round(lp * (1 - dp / 100));
}

export function calcDiscountFromFinal(listPrice: number, finalPrice: number): number {
  const lp = Number(listPrice) || 0;
  if (lp <= 0) return 0;
  const fp = Math.min(Math.max(Number(finalPrice) || 0, 0), lp);
  const rate = (1 - fp / lp) * 100;
  return Math.round(rate * 100) / 100;
}

export const generateUUID = (): string => {
  // A simple UUID generator that works in non-secure contexts.
  // This is a fallback for crypto.randomUUID() which is only available in secure contexts (HTTPS).
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Basic fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};