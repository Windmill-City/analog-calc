const SUFFIX_MAP: Record<string, number> = {
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  µ: 1e-6,
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
};

export function parseWithUnit(s: string): number {
  s = s.trim();
  const num = Number(s);
  if (!isNaN(num)) return num;

  const match = s.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)([pnuµmkKMG])$/i);
  if (match) {
    const value = parseFloat(match[1]);
    const suffix = match[2];
    const mult = SUFFIX_MAP[suffix];
    if (mult !== undefined) return value * mult;
  }
  return NaN;
}

const PREFIXES = [
  { prefix: "G", divisor: 1e9 },
  { prefix: "M", divisor: 1e6 },
  { prefix: "k", divisor: 1e3 },
  { prefix: "", divisor: 1 },
  { prefix: "m", divisor: 1e-3 },
  { prefix: "µ", divisor: 1e-6 },
  { prefix: "n", divisor: 1e-9 },
  { prefix: "p", divisor: 1e-12 },
];

export function formatSi(value: number, unit: string, decimals = 2): string {
  const abs = Math.abs(value);
  if (abs === 0) return `0 ${unit}`;
  for (const { prefix, divisor } of PREFIXES) {
    if (abs >= divisor) {
      const scaled = value / divisor;
      return `${scaled.toFixed(decimals)} ${prefix}${unit}`;
    }
  }
  return `${value.toExponential(decimals)} ${unit}`;
}

export function formatResistance(ohms: number): string {
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(2)} MΩ`;
  if (ohms >= 1e3) return `${(ohms / 1e3).toFixed(2)} kΩ`;
  return `${ohms.toFixed(1)} Ω`;
}
