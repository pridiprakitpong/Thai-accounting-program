import { allocateSatang } from "./money";

export const WHT_RATES = [0, 1, 2, 3, 5] as const;
export type WhtRate = (typeof WHT_RATES)[number];

export function isWhtRate(value: number): value is WhtRate {
  return (WHT_RATES as readonly number[]).includes(value);
}

export type ExpenseLineInput = {
  description: string;
  incomeType: string;
  base: number;
  whtRate: number;
  payCondition?: string;
};

export type CalculatedExpenseLine = {
  description: string;
  incomeType: string;
  payCondition: string;
  whtRate: number;
  baseAmount: number;
  vatAmount: number;
  whtAmount: number;
};

export type CalculatedExpense = {
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  total: number;
  netPayable: number;
  lines: CalculatedExpenseLine[];
};

/**
 * Purchase VAT is 7% or 0, computed once on the sum of the line bases.
 * Withholding tax is per line because the rate can differ (rent 5%, service 3%).
 * WHT is calculated on the base, before VAT. Net payable is base + VAT − WHT.
 */
export function calculateExpense(lines: ExpenseLineInput[], vatPercent: number): CalculatedExpense {
  if (vatPercent !== 0 && vatPercent !== 7) {
    throw new Error("VAT rate must be 0 or 7");
  }
  for (const line of lines) {
    if (!isWhtRate(line.whtRate)) throw new Error("Withholding tax rate must be 0, 1, 2, 3, or 5");
  }
  const bases = lines.map((line) => line.base);
  const subtotal = bases.reduce((sum, value) => sum + value, 0);
  const vatAmount = vatPercent === 0 ? 0 : Math.round((subtotal * vatPercent) / 100);
  const vatShares = allocateSatang(vatAmount, bases);
  const computed: CalculatedExpenseLine[] = lines.map((line, index) => ({
    description: line.description,
    incomeType: line.incomeType,
    payCondition: line.payCondition ?? "1",
    whtRate: line.whtRate,
    baseAmount: line.base,
    vatAmount: vatShares[index] ?? 0,
    whtAmount: Math.round((line.base * line.whtRate) / 100),
  }));
  const whtAmount = computed.reduce((sum, line) => sum + line.whtAmount, 0);
  const total = subtotal + vatAmount;
  return {
    subtotal,
    vatAmount,
    whtAmount,
    total,
    netPayable: total - whtAmount,
    lines: computed,
  };
}
