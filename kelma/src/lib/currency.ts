export interface CurrencyMeta {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "RUB", symbol: "₽", label: "Рубль", locale: "ru-RU" },
  { code: "EUR", symbol: "€", label: "Евро", locale: "de-DE" },
  { code: "PLN", symbol: "zł", label: "Злотый", locale: "pl-PL" },
  { code: "USD", symbol: "$", label: "Доллар", locale: "en-US" },
  { code: "KZT", symbol: "₸", label: "Тенге", locale: "ru-KZ" },
  { code: "UAH", symbol: "₴", label: "Гривна", locale: "uk-UA" },
  { code: "GBP", symbol: "£", label: "Фунт", locale: "en-GB" },
  { code: "CZK", symbol: "Kč", label: "Крона", locale: "cs-CZ" }
];

const DEFAULT_CURRENCY = CURRENCIES[0];

export function getCurrency(code: string | null | undefined): CurrencyMeta {
  if (!code) return DEFAULT_CURRENCY;
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCY;
}

export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code);
}

/** Formats a bare number using the currency's locale, without the symbol. */
export function formatAmount(value: number, code?: string | null): string {
  const currency = getCurrency(code);
  return new Intl.NumberFormat(currency.locale, { maximumFractionDigits: 2 }).format(value);
}

/** Formats a number with its currency symbol appended, e.g. "15 750 ₽". */
export function formatMoney(value: number, code?: string | null): string {
  const currency = getCurrency(code);
  return `${formatAmount(value, code)} ${currency.symbol}`;
}
