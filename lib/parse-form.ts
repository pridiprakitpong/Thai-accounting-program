import { z } from "zod";
import { tr, type Locale } from "./i18n";
import { isWhtRate } from "./tax/expense";
import { parseMoneyToSatang, parseQuantityMillis } from "./tax/money";
import { calculateSales, type VatMode } from "./tax/sales";
import { calculateExpense } from "./tax/expense";
import { isValidThaiTaxId } from "./tax/tax-id";

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const salesSchema = z.object({
  type: z.enum(["quotation", "invoice", "tax_invoice"]),
  contactId: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string(),
  vatMode: z.enum(["exclusive", "inclusive", "none"]),
  remarks: z.string().max(1000),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        quantity: z.string(),
        unitPrice: z.string(),
      }),
    )
    .min(1)
    .max(30),
});

export function parseSalesForm(formData: FormData, locale: Locale) {
  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    rawLines = [];
  }
  const parsed = salesSchema.safeParse({
    type: String(formData.get("type") ?? ""),
    contactId: String(formData.get("contactId") ?? ""),
    issueDate: String(formData.get("issueDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    vatMode: String(formData.get("vatMode") ?? ""),
    remarks: String(formData.get("remarks") ?? ""),
    lines: rawLines,
  });
  if (!parsed.success || !isIsoDate(parsed.data.issueDate) || (parsed.data.dueDate && !isIsoDate(parsed.data.dueDate))) {
    return { error: tr(locale, "ข้อมูลเอกสารไม่ครบหรือวันที่ไม่ถูกต้อง", "The document is incomplete or a date is invalid.") };
  }
  const lines = [];
  for (const line of parsed.data.lines) {
    const quantityMillis = parseQuantityMillis(line.quantity);
    const unitPrice = parseMoneyToSatang(line.unitPrice);
    if (!quantityMillis || unitPrice == null) {
      return { error: tr(locale, "จำนวนหรือราคาต่อหน่วยไม่ถูกต้อง", "Quantity or unit price is invalid.") };
    }
    lines.push({ description: line.description, quantityMillis, unitPrice });
  }
  const calculated = calculateSales(lines, parsed.data.vatMode as VatMode);
  return { data: { ...parsed.data, calculated } };
}

const expenseSchema = z.object({
  contactId: z.string().min(1),
  category: z.string().min(1).max(40),
  billDate: z.string(),
  taxInvoiceNo: z.string().trim().min(1).max(60),
  taxInvoiceDate: z.string(),
  vatRate: z.enum(["0", "7"]),
  notes: z.string().max(1000),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        amount: z.string(),
        whtRate: z.number(),
        incomeType: z.string().min(1).max(40),
        payCondition: z.enum(["1", "2", "3"]),
      }),
    )
    .min(1)
    .max(30),
});

export function parseExpenseForm(formData: FormData, locale: Locale) {
  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    rawLines = [];
  }
  const normalized = Array.isArray(rawLines)
    ? rawLines.map((line) => ({
        ...(line as object),
        whtRate: Number((line as { whtRate?: unknown }).whtRate),
        payCondition: String((line as { payCondition?: unknown }).payCondition ?? "1"),
      }))
    : [];
  const parsed = expenseSchema.safeParse({
    contactId: String(formData.get("contactId") ?? ""),
    category: String(formData.get("category") ?? ""),
    billDate: String(formData.get("billDate") ?? ""),
    taxInvoiceNo: String(formData.get("taxInvoiceNo") ?? ""),
    taxInvoiceDate: String(formData.get("taxInvoiceDate") ?? ""),
    vatRate: String(formData.get("vatRate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    lines: normalized,
  });
  if (!parsed.success || !isIsoDate(parsed.data.billDate) || !isIsoDate(parsed.data.taxInvoiceDate)) {
    return { error: tr(locale, "ข้อมูลค่าใช้จ่ายไม่ครบหรือวันที่ไม่ถูกต้อง", "The expense is incomplete or a date is invalid.") };
  }
  const lines = [];
  for (const line of parsed.data.lines) {
    if (!isWhtRate(line.whtRate)) {
      return { error: tr(locale, "อัตราหัก ณ ที่จ่ายต้องเป็น 0, 1, 2, 3 หรือ 5", "Withholding tax must be 0, 1, 2, 3, or 5%.") };
    }
    const base = parseMoneyToSatang(line.amount);
    if (base == null || base <= 0) {
      return { error: tr(locale, "จำนวนเงินก่อน VAT ไม่ถูกต้อง", "The amount before VAT is invalid.") };
    }
    lines.push({
      description: line.description,
      incomeType: line.incomeType,
      base,
      whtRate: line.whtRate,
      payCondition: line.payCondition,
    });
  }
  const calculated = calculateExpense(lines, Number(parsed.data.vatRate));
  return { data: { ...parsed.data, vatRate: Number(parsed.data.vatRate), calculated } };
}

const contactSchema = z.object({
  role: z.enum(["customer", "vendor", "both"]),
  partyType: z.enum(["juristic", "individual"]),
  titleTh: z.string().trim().max(40),
  titleEn: z.string().trim().max(40),
  nameTh: z.string().trim().min(1).max(150),
  nameEn: z.string().trim().max(150),
  lastNameTh: z.string().trim().max(150),
  lastNameEn: z.string().trim().max(150),
  taxId: z.string().trim(),
  branchCode: z.string().trim().regex(/^\d{1,6}$/),
  addressTh: z.string().trim().min(1).max(400),
  addressEn: z.string().trim().max(400),
  phone: z.string().trim().max(40),
  email: z.string().trim().max(120),
  building: z.string().trim().max(80),
  roomNo: z.string().trim().max(20),
  floorNo: z.string().trim().max(20),
  village: z.string().trim().max(80),
  addressNo: z.string().trim().max(20),
  moo: z.string().trim().max(20),
  soi: z.string().trim().max(80),
  street: z.string().trim().max(80),
  subdistrict: z.string().trim().max(80),
  district: z.string().trim().max(80),
  province: z.string().trim().max(80),
  postalCode: z.string().trim().regex(/^$|^\d{5}$/),
});

export function parseContactForm(formData: FormData, locale: Locale) {
  const data: Record<string, string> = {};
  for (const key of Object.keys(contactSchema.shape)) data[key] = String(formData.get(key) ?? "");
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    return { error: tr(locale, "ข้อมูลผู้ติดต่อไม่ครบ", "The contact is incomplete.") };
  }
  if (!isValidThaiTaxId(parsed.data.taxId)) {
    return { error: tr(locale, "เลขประจำตัวผู้เสียภาษี 13 หลักไม่ถูกต้อง", "The 13-digit tax ID is not valid.") };
  }
  if (parsed.data.partyType === "individual" && !parsed.data.lastNameTh) {
    return { error: tr(locale, "บุคคลธรรมดาต้องมีนามสกุล", "An individual needs a last name.") };
  }
  return { data: parsed.data };
}

const companySchema = z.object({
  nameTh: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  taxId: z.string().trim(),
  branchCode: z.string().trim().regex(/^\d{1,6}$/),
  addressTh: z.string().trim().min(1).max(400),
  addressEn: z.string().trim().max(400),
  phone: z.string().trim().max(40),
  email: z.string().trim().max(120),
  rdUserId: z.string().trim().max(20),
});

export function parseCompanyForm(formData: FormData, locale: Locale) {
  const data: Record<string, string> = {};
  for (const key of Object.keys(companySchema.shape)) data[key] = String(formData.get(key) ?? "");
  const parsed = companySchema.safeParse(data);
  if (!parsed.success) return { error: tr(locale, "ข้อมูลบริษัทไม่ครบ", "The company profile is incomplete.") };
  if (!isValidThaiTaxId(parsed.data.taxId)) {
    return { error: tr(locale, "เลขประจำตัวผู้เสียภาษี 13 หลักไม่ถูกต้อง", "The 13-digit tax ID is not valid.") };
  }
  return { data: parsed.data };
}
