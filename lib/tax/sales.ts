import { allocateSatang, extendAmount } from "./money";

export type VatMode = "exclusive" | "inclusive" | "none";

export type SalesLineInput = {
  description: string;
  quantityMillis: number;
  unitPrice: number;
};

export type CalculatedSalesLine = SalesLineInput & {
  amount: number;
  baseAmount: number;
  vatAmount: number;
};

export type CalculatedSales = {
  subtotal: number;
  vatAmount: number;
  total: number;
  lines: CalculatedSalesLine[];
};

/**
 * VAT 7% is applied to the document total.
 * Exclusive: the entered amount is the base. Inclusive: the entered amount
 * already contains VAT. None: no VAT. Line VAT is only an allocation of the
 * document VAT, so the lines always add back to the document.
 */
export function calculateSales(lines: SalesLineInput[], mode: VatMode): CalculatedSales {
  const prepared = lines.map((line) => ({
    ...line,
    amount: extendAmount(line.quantityMillis, line.unitPrice),
  }));
  const entered = prepared.reduce((sum, line) => sum + line.amount, 0);
  let subtotal: number;
  let vatAmount: number;
  let total: number;
  if (mode === "none") {
    subtotal = entered;
    vatAmount = 0;
    total = entered;
  } else if (mode === "exclusive") {
    subtotal = entered;
    vatAmount = Math.round((subtotal * 7) / 100);
    total = subtotal + vatAmount;
  } else {
    total = entered;
    subtotal = Math.round((total * 100) / 107);
    vatAmount = total - subtotal;
  }
  const weights = prepared.map((line) => line.amount);
  const bases = mode === "inclusive" ? allocateSatang(subtotal, weights) : weights;
  const vats = allocateSatang(vatAmount, weights);
  return {
    subtotal,
    vatAmount,
    total,
    lines: prepared.map((line, index) => ({
      ...line,
      baseAmount: bases[index] ?? 0,
      vatAmount: vats[index] ?? 0,
    })),
  };
}
