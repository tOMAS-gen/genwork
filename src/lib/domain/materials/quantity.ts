const DECIMAL_RE = /^\d+(?:\.\d{1,6})?$/;

export function normalizeQuantity(value: string): string | null {
  const raw = value.trim().replace(",", ".");
  if (!DECIMAL_RE.test(raw)) return null;

  const [whole, fraction = ""] = raw.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction.replace(/0+$/, "");
  if (BigInt(normalizedWhole) === 0n && normalizedFraction === "") return null;

  return normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
}

export function isWholeQuantity(value: string): boolean {
  const normalized = normalizeQuantity(value);
  return Boolean(normalized && !normalized.includes("."));
}

export function addQuantity(a: string, b: string): string {
  const scale = 1_000_000n;
  const sum = toScaled(a) + toScaled(b);
  const whole = sum / scale;
  const fraction = (sum % scale).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function toScaled(value: string): bigint {
  const normalized = normalizeQuantity(value);
  if (!normalized) return 0n;
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}
