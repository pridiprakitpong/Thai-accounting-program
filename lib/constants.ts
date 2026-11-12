export const INCOME_TYPES = [
  { key: "service", section: "40(8)", defaultRate: 3, th: "ค่าบริการ", en: "Service", pnd: "ค่าบริการ" },
  { key: "rental", section: "40(5)", defaultRate: 5, th: "ค่าเช่า", en: "Rental", pnd: "ค่าเช่าทรัพย์สิน" },
  { key: "advertising", section: "40(8)", defaultRate: 2, th: "ค่าโฆษณา", en: "Advertising", pnd: "ค่าโฆษณา" },
  { key: "transport", section: "40(8)", defaultRate: 1, th: "ค่าขนส่ง", en: "Transport", pnd: "ค่าขนส่ง" },
  { key: "professional", section: "40(6)", defaultRate: 3, th: "ค่าวิชาชีพ", en: "Professional fee", pnd: "ค่าวิชาชีพอิสระ" },
  { key: "contract", section: "40(7)", defaultRate: 3, th: "ค่ารับจ้างทำของ", en: "Hire of work", pnd: "ค่ารับจ้างทำของ" },
  { key: "other", section: "40(8)", defaultRate: 3, th: "อื่น ๆ", en: "Other", pnd: "เงินได้อื่น" },
] as const;

export const CATEGORIES = [
  { key: "rent", th: "ค่าเช่า", en: "Rent" },
  { key: "service", th: "ค่าบริการ", en: "Services" },
  { key: "utility", th: "สาธารณูปโภค", en: "Utilities" },
  { key: "supplies", th: "วัสดุสำนักงาน", en: "Office supplies" },
  { key: "travel", th: "ค่าเดินทาง", en: "Travel" },
  { key: "professional", th: "ค่าที่ปรึกษา", en: "Professional fees" },
  { key: "other", th: "อื่น ๆ", en: "Other" },
] as const;

export const SALES_TYPES = [
  { key: "quotation", prefix: "QT", th: "ใบเสนอราคา", en: "Quotation" },
  { key: "invoice", prefix: "IV", th: "ใบแจ้งหนี้", en: "Invoice" },
  { key: "tax_invoice", prefix: "TI", th: "ใบกำกับภาษี/ใบเสร็จรับเงิน", en: "Tax invoice/receipt" },
] as const;

export const VAT_MODES = [
  { key: "exclusive", th: "บวก VAT 7%", en: "VAT 7% exclusive" },
  { key: "inclusive", th: "รวม VAT 7%", en: "VAT 7% inclusive" },
  { key: "none", th: "ไม่มี VAT", en: "No VAT" },
] as const;

export const WHT_RATE_OPTIONS = [0, 1, 2, 3, 5] as const;

export const PAY_CONDITIONS = [
  { key: "1", th: "หัก ณ ที่จ่าย", en: "Withheld at source" },
  { key: "2", th: "ออกให้ตลอดไป", en: "Issued forever" },
  { key: "3", th: "ออกให้ครั้งเดียว", en: "Issued once" },
] as const;

export type IncomeKey = (typeof INCOME_TYPES)[number]["key"];
export type SalesType = (typeof SALES_TYPES)[number]["key"];
export type VatModeKey = (typeof VAT_MODES)[number]["key"];

export function incomeType(key: string) {
  return INCOME_TYPES.find((item) => item.key === key) ?? INCOME_TYPES[INCOME_TYPES.length - 1];
}

export function categoryLabel(key: string, locale: "th" | "en") {
  const item = CATEGORIES.find((category) => category.key === key);
  if (!item) return key;
  return locale === "en" ? item.en : item.th;
}

export function salesTypeLabel(key: string, locale: "th" | "en") {
  const item = SALES_TYPES.find((type) => type.key === key);
  if (!item) return key;
  return locale === "en" ? item.en : item.th;
}

export function salesPrefix(key: string) {
  return SALES_TYPES.find((type) => type.key === key)?.prefix ?? "DOC";
}

export function vatModeLabel(key: string, locale: "th" | "en") {
  const item = VAT_MODES.find((mode) => mode.key === key);
  if (!item) return key;
  return locale === "en" ? item.en : item.th;
}
