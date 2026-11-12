/** Thai tax-id / national-id check digit. */
export function thaiTaxIdCheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error("Tax id prefix must be 12 digits");
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(first12[index]) * (13 - index);
  }
  return (11 - (sum % 11)) % 10;
}

export function withThaiTaxIdCheckDigit(first12: string): string {
  return `${first12}${thaiTaxIdCheckDigit(first12)}`;
}

export function isValidThaiTaxId(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  return thaiTaxIdCheckDigit(value.slice(0, 12)) === Number(value[12]);
}

export function formatTaxId(value: string): string {
  if (!/^\d{13}$/.test(value)) return value;
  return `${value[0]}-${value.slice(1, 5)}-${value.slice(5, 10)}-${value.slice(10, 12)}-${value[12]}`;
}
