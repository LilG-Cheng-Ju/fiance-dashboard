export const SUPPORTED_CURRENCIES = [
  "TWD", "USD", "JPY", "SGD", "KRW", "CNY", "EUR", "GBP", "AUD", "CAD"
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];