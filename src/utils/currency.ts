import type { CurrencyCode } from '../types/venuza';

// Exchange rates relative to 1 USD (approximate market rates for visitor conversion)
const RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  GHS: 15.2,
  NGN: 1580,
  GBP: 0.79,
  EUR: 0.92,
};

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; label: string; decimals: number }
> = {
  GHS: { symbol: '₵', label: 'GHS (Ghana Cedi)', decimals: 0 },
  USD: { symbol: '$', label: 'USD (US Dollar)', decimals: 0 },
  GBP: { symbol: '£', label: 'GBP (British Pound)', decimals: 0 },
  NGN: { symbol: '₦', label: 'NGN (Nigerian Naira)', decimals: 0 },
  EUR: { symbol: '€', label: 'EUR (Euro)', decimals: 0 },
};

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (from === to) return amount;
  const amountInUsd = amount / RATES_TO_USD[from];
  return Math.round(amountInUsd * RATES_TO_USD[to]);
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const meta = CURRENCY_META[currency];
  return `${meta.symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

export function calculateSubscriptionPricing(bookingCharge: number) {
  const monthlyStandard = Math.round(bookingCharge * 0.1);
  // Super package: 15 months paid upfront at 10% of booking fee per month with a 10% package discount
  const fifteenMonthsGross = monthlyStandard * 15;
  const superPackageDiscount = Math.round(fifteenMonthsGross * 0.1);
  const superPackageTotal = fifteenMonthsGross - superPackageDiscount;
  const superPackageEffectiveMonthly = Math.round(superPackageTotal / 15);

  return {
    monthlyStandard,
    fifteenMonthsGross,
    superPackageDiscount,
    superPackageTotal,
    superPackageEffectiveMonthly,
  };
}
