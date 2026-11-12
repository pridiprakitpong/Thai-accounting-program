export type VatKind = "output" | "input";

export type VatDocument = {
  id: string;
  kind: VatKind;
  /** YYYY-MM of the tax point. Output: issue date. Input: tax invoice date. */
  period: string;
  vat: number;
  /** Period key once a PP30 draft has claimed the document. */
  lockedTo: string | null;
  active: boolean;
};

export type Pp30Month = {
  period: string;
  outputVat: number;
  inputVat: number;
  carryIn: number;
  vatPayable: number;
  excessVat: number;
  outputIds: string[];
  inputIds: string[];
};

export function outputVatPeriod(issueDate: string): string {
  return issueDate.slice(0, 7);
}

/** Input VAT follows the tax invoice date, never the purchase bill date. */
export function inputVatPeriod(taxInvoiceDate: string): string {
  return taxInvoiceDate.slice(0, 7);
}

export function computeVatPosition(outputVat: number, inputVat: number, carryIn: number) {
  const net = outputVat - inputVat - carryIn;
  if (net > 0) return { carryIn, vatPayable: net, excessVat: 0 };
  if (net < 0) return { carryIn, vatPayable: 0, excessVat: -net };
  return { carryIn, vatPayable: 0, excessVat: 0 };
}

export function listPeriods(from: string, to: string): string[] {
  if (from > to) return [];
  const periods: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const endYear = Number(to.slice(0, 4));
  const endMonth = Number(to.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return periods;
}

/**
 * A document is counted in `lockedTo` when a draft has claimed it, otherwise in
 * its own tax-point month. An inactive document is skipped. The same id cannot
 * satisfy two periods, so a document is never counted twice.
 */
export function documentsForMonth(docs: VatDocument[], period: string): VatDocument[] {
  return docs.filter(
    (doc) => doc.active && (doc.lockedTo === period || (doc.lockedTo == null && doc.period === period)),
  );
}

export function buildPp30Series(docs: VatDocument[], fromPeriod: string, toPeriod: string): Pp30Month[] {
  let carry = 0;
  return listPeriods(fromPeriod, toPeriod).map((period) => {
    const selected = documentsForMonth(docs, period);
    const outputs = selected.filter((doc) => doc.kind === "output");
    const inputs = selected.filter((doc) => doc.kind === "input");
    const outputVat = outputs.reduce((sum, doc) => sum + doc.vat, 0);
    const inputVat = inputs.reduce((sum, doc) => sum + doc.vat, 0);
    const position = computeVatPosition(outputVat, inputVat, carry);
    carry = position.excessVat;
    return {
      period,
      outputVat,
      inputVat,
      ...position,
      outputIds: outputs.map((doc) => doc.id),
      inputIds: inputs.map((doc) => doc.id),
    };
  });
}

export function seriesBounds(periods: string[], target: string): { from: string; to: string } {
  const all = periods.filter(Boolean);
  const from = all.length === 0 ? target : all.reduce((min, value) => (value < min ? value : min), all[0]);
  return { from: from < target ? from : target, to: target };
}
