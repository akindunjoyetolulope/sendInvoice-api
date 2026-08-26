/** Converts a naira amount (string or number, e.g. "1,234.50") to integer kobo. */
export function toKobo(amount: string | number): number {
  const value = typeof amount === "string" ? Number(amount.replace(/,/g, "")) : amount
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}

/** Converts integer kobo to a naira number. */
export function fromKobo(kobo: number): number {
  return kobo / 100
}
