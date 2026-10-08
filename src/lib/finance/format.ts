export const SUPPORTED_CURRENCIES = ["EUR", "USD", "RSD", "GBP"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  RSD: "RSD ",
  GBP: "£",
};

/**
 * Formats integer cents into a localized currency string.
 * @param amountCents Integer cents (e.g. 1050 for 10.50)
 * @param currency Currency code (EUR, USD, RSD, GBP)
 */
export function formatMoney(amountCents: number, currency: string = "EUR"): string {
  const isNegative = amountCents < 0;
  const absCents = Math.abs(amountCents);
  const major = Math.floor(absCents / 100);
  const minor = absCents % 100;
  const formattedNumber = `${major.toLocaleString("en-US")}.${minor.toString().padStart(2, "0")}`;

  const symbol = CURRENCY_SYMBOLS[currency as CurrencyCode] || `${currency} `;
  
  // EUR: 10.50 € or €10.50, USD: $10.50, GBP: £10.50, RSD: 10.50 RSD
  if (currency === "RSD") {
    return `${isNegative ? "-" : ""}${formattedNumber} ${currency}`;
  }

  return `${isNegative ? "-" : ""}${symbol}${formattedNumber}`;
}

/**
 * Parses a decimal string (e.g. "12.50") or number to exact integer cents without floating point precision issues.
 */
export function parseToCents(val: string | number): number {
  if (typeof val === "number") {
    return Math.round(val * 100);
  }
  const clean = val.trim().replace(/,/g, ".");
  if (!clean) return 0;

  const parts = clean.split(".");
  const major = parseInt(parts[0] || "0", 10);
  if (isNaN(major)) return 0;

  let minor = 0;
  if (parts.length > 1) {
    const minorStr = parts[1].padEnd(2, "0").slice(0, 2);
    minor = parseInt(minorStr, 10);
    if (isNaN(minor)) minor = 0;
  }

  const sign = clean.startsWith("-") ? -1 : 1;
  const total = Math.abs(major) * 100 + minor;
  return sign * total;
}

/**
 * Converts integer cents back to standard decimal string (e.g. 1050 -> "10.50") for form inputs.
 */
export function centsToDecimalString(cents: number): string {
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = (abs % 100).toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${major}.${minor}`;
}
