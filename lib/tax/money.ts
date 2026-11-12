/** Integer satang (1/100 baht). Half-up rounding for positive amounts. */

export function parseMoneyToSatang(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  if (whole.length > 12) return null;
  const satang = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(satang)) return null;
  return satang;
}

export function parseQuantityMillis(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const millis = Number(whole) * 1000 + Number((frac + "000").slice(0, 3));
  if (!Number.isSafeInteger(millis) || millis <= 0 || millis > 1_000_000_000) return null;
  return millis;
}

export function formatQuantity(millis: number): string {
  const whole = Math.floor(millis / 1000);
  const frac = millis % 1000;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

export function satangToInput(satang: number): string {
  const whole = Math.floor(Math.abs(satang) / 100);
  const frac = Math.abs(satang) % 100;
  return `${satang < 0 ? "-" : ""}${whole}.${String(frac).padStart(2, "0")}`;
}

/** Last weight absorbs the remainder so the parts sum to total. */
export function allocateSatang(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total === 0) return weights.map(() => 0);
  const out: number[] = [];
  let used = 0;
  weights.forEach((weight, index) => {
    if (index === weights.length - 1) {
      out.push(total - used);
      return;
    }
    const share = Math.floor((total * weight) / sum);
    out.push(share);
    used += share;
  });
  return out;
}

export function extendAmount(quantityMillis: number, unitPriceSatang: number): number {
  return Math.round((quantityMillis * unitPriceSatang) / 1000);
}
