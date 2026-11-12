import { branchLabel, contactName, formatDate, formatMoney, type NameParts } from "../format";
import type { Locale } from "../i18n";
import { tr } from "../i18n";
import { categoryLabel, incomeType, vatModeLabel } from "../constants";
import { bahtText, bahtTextEn } from "../tax/baht-text";
import { formatTaxId } from "../tax/tax-id";
import { formatQuantity } from "../tax/money";
import { green, muted, Sheet } from "./draw";

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export async function salesPdf(input: {
  locale: Locale;
  company: { nameTh: string; nameEn: string; taxId: string; branchCode: string; addressTh: string; addressEn: string; phone: string; email: string };
  contact: NameParts & { taxId: string; branchCode: string; addressTh: string; addressEn: string };
  document: {
    type: string;
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    vatMode: string;
    remarks: string;
    subtotal: number;
    vatAmount: number;
    total: number;
    lines: { description: string; quantity: number; unitPrice: number; amount: number }[];
  };
}): Promise<Uint8Array> {
  const { locale, company, contact, document } = input;
  const thai = locale === "th";
  const sheet = await Sheet.create();
  const companyName = thai || !company.nameEn ? company.nameTh : company.nameEn;
  const address = thai || !company.addressEn ? company.addressTh : company.addressEn;
  const paidReceipt = document.type === "tax_invoice" && document.status === "paid";
  const title = thai
    ? document.type === "quotation"
      ? "ใบเสนอราคา"
      : document.type === "invoice"
        ? "ใบแจ้งหนี้"
        : paidReceipt
          ? "ใบกำกับภาษี / ใบเสร็จรับเงิน"
          : "ใบกำกับภาษี"
    : document.type === "quotation"
      ? "Quotation"
      : document.type === "invoice"
        ? "Invoice"
        : paidReceipt
          ? "Tax invoice / Receipt"
          : "Tax invoice";
  sheet.draw("BAI KHIAO BOOKS", 40, 800, 9, "semibold", green);
  sheet.draw(companyName, 40, 780, 16, "bold");
  sheet.draw(clip(address, 90), 40, 762, 9, "regular", muted);
  sheet.draw(
    `${tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")} ${formatTaxId(company.taxId)} · ${branchLabel(company.branchCode, locale)}`,
    40,
    748,
    9,
    "regular",
    muted,
  );
  const titleWidth = sheet.widthOf(title, 16, "bold");
  sheet.draw(title, 555 - titleWidth, 786, 16, "bold");
  const number = `${tr(locale, "เลขที่", "No.")} ${document.number}`;
  sheet.draw(number, 555 - sheet.widthOf(number, 10, "semibold"), 766, 10, "semibold");
  const date = formatDate(document.issueDate, locale);
  sheet.draw(date, 555 - sheet.widthOf(date, 10), 750, 10, "regular", muted);
  sheet.y = 724;
  sheet.band(62);
  const top = sheet.y + 8;
  sheet.draw(tr(locale, "ลูกค้า", "Customer"), 52, top, 9, "regular", muted);
  sheet.draw(contactName(contact, locale), 52, top - 16, 12, "semibold");
  const customerAddress = thai || !contact.addressEn ? contact.addressTh : contact.addressEn;
  sheet.draw(clip(customerAddress, 80), 52, top - 32, 9, "regular", muted);
  sheet.draw(`${formatTaxId(contact.taxId)} · ${branchLabel(contact.branchCode, locale)}`, 52, top - 46, 9, "regular", muted);
  sheet.y = top - 70;
  sheet.draw(tr(locale, "รายการ", "Description"), 40, sheet.y, 9, "semibold", muted);
  sheet.draw(tr(locale, "จำนวน", "Qty"), 340, sheet.y, 9, "semibold", muted);
  sheet.draw(tr(locale, "ราคา/หน่วย", "Unit price"), 400, sheet.y, 9, "semibold", muted);
  sheet.draw(tr(locale, "จำนวนเงิน", "Amount"), 490, sheet.y, 9, "semibold", muted);
  sheet.y -= 8;
  sheet.rule();
  for (const line of document.lines) {
    sheet.ensure(18);
    sheet.draw(clip(line.description, 42), 40, sheet.y - 11, 10);
    sheet.draw(formatQuantity(line.quantity), 340, sheet.y - 11, 10);
    sheet.draw(formatMoney(line.unitPrice, locale), 400, sheet.y - 11, 10);
    const amount = formatMoney(line.amount, locale);
    sheet.draw(amount, 555 - sheet.widthOf(amount, 10), sheet.y - 11, 10);
    sheet.y -= 20;
  }
  sheet.rule();
  const rows: [string, string][] = [
    [tr(locale, "มูลค่าก่อนภาษี", "Amount before VAT"), formatMoney(document.subtotal, locale)],
    ...(document.vatMode === "none" ? [] : [[tr(locale, "ภาษีมูลค่าเพิ่ม 7%", "VAT 7%"), formatMoney(document.vatAmount, locale)] as [string, string]]),
    [tr(locale, "จำนวนเงินรวม", "Total"), formatMoney(document.total, locale)],
  ];
  for (const [label, value] of rows) {
    sheet.draw(label, 360, sheet.y - 12, label.startsWith(tr(locale, "จำนวน", "Total").slice(0, 2)) ? 12 : 10, label === rows[rows.length - 1][0] ? "bold" : "regular");
    sheet.draw(value, 555 - sheet.widthOf(value, 11, "semibold"), sheet.y - 12, 11, "semibold");
    sheet.y -= 18;
  }
  const words = thai ? bahtText(document.total) : bahtTextEn(document.total);
  sheet.text(`(${words})`, { size: 10, color: muted, gap: 16 });
  sheet.text(vatModeLabel(document.vatMode, locale), { size: 9, color: muted });
  if (document.remarks) sheet.text(clip(document.remarks, 140), { size: 9, color: muted });
  if (document.status === "void") sheet.text(tr(locale, "เอกสารนี้ถูกยกเลิก", "This document is void."), { size: 12, weight: "bold" });
  sheet.y -= 28;
  sheet.draw(tr(locale, "ผู้รับเอกสาร", "Received by"), 80, sheet.y, 9, "regular", muted);
  sheet.draw(tr(locale, "ผู้มีอำนาจลงนาม", "Authorized signature"), 360, sheet.y, 9, "regular", muted);
  sheet.page.drawLine({ start: { x: 60, y: sheet.y - 28 }, end: { x: 200, y: sheet.y - 28 }, thickness: 0.6, color: inkColor() });
  sheet.page.drawLine({ start: { x: 340, y: sheet.y - 28 }, end: { x: 500, y: sheet.y - 28 }, thickness: 0.6, color: inkColor() });
  return sheet.bytes();
}

function inkColor() {
  return muted;
}

export async function whtPdf(input: {
  locale: Locale;
  company: { nameTh: string; nameEn: string; taxId: string; branchCode: string; addressTh: string; addressEn: string };
  contact: NameParts & { taxId: string; branchCode: string; addressTh: string; addressEn: string; partyType: string };
  certificate: { number: string; status: string; paymentDate: string; formType: string; baseAmount: number; taxAmount: number };
  lines: { description: string; incomeType: string; whtRate: number; baseAmount: number; whtAmount: number; payCondition: string }[];
  category: string;
}): Promise<Uint8Array> {
  const { locale, company, contact, certificate, lines } = input;
  const thai = locale === "th";
  const sheet = await Sheet.create();
  sheet.draw("BAI KHIAO BOOKS", 40, 800, 9, "semibold", green);
  sheet.text(thai ? "หนังสือรับรองการหักภาษี ณ ที่จ่าย" : "Withholding tax certificate", { size: 16, weight: "bold", gap: 18 });
  sheet.y = 770;
  sheet.text(
    `${thai ? "ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร" : "Section 50 bis of the Revenue Code"} · ${certificate.formType === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"} · ${certificate.number}`,
    { size: 9, color: muted },
  );
  sheet.text(`${tr(locale, "วันที่จ่าย", "Payment date")} ${formatDate(certificate.paymentDate, locale)} · ${categoryLabel(input.category, locale)} · ${certificate.status === "confirmed" ? tr(locale, "ยืนยันแล้ว", "Confirmed") : tr(locale, "ฉบับร่าง", "Draft")}`, { size: 9, color: muted, gap: 16 });
  const payer = thai || !company.nameEn ? company.nameTh : company.nameEn;
  const payee = contactName(contact, locale);
  sheet.text(tr(locale, "ผู้มีหน้าที่หักภาษี", "Payer"), { size: 9, color: muted, gap: 12 });
  sheet.text(payer, { size: 12, weight: "semibold", gap: 14 });
  sheet.text(`${formatTaxId(company.taxId)} · ${branchLabel(company.branchCode, locale)}`, { size: 9, color: muted, gap: 16 });
  sheet.text(tr(locale, "ผู้ถูกหักภาษี", "Payee"), { size: 9, color: muted, gap: 12 });
  sheet.text(payee, { size: 12, weight: "semibold", gap: 14 });
  sheet.text(`${formatTaxId(contact.taxId)} · ${branchLabel(contact.branchCode, locale)}`, { size: 9, color: muted, gap: 18 });
  sheet.rule();
  for (const line of lines) {
    const kind = incomeType(line.incomeType);
    sheet.ensure(28);
    sheet.draw(`${line.description} · ${thai ? kind.th : kind.en} (${kind.section})`, 40, sheet.y - 12, 10);
    const tax = formatMoney(line.whtAmount, locale);
    sheet.draw(tax, 555 - sheet.widthOf(tax, 10, "semibold"), sheet.y - 12, 10, "semibold");
    sheet.draw(`${formatMoney(line.baseAmount, locale)} × ${line.whtRate.toFixed(2)}%`, 40, sheet.y - 26, 9, "regular", muted);
    sheet.y -= 34;
  }
  sheet.rule();
  sheet.text(`${tr(locale, "รวมเงินที่จ่าย", "Total paid")} ${formatMoney(certificate.baseAmount, locale)}`, { size: 11 });
  sheet.text(`${tr(locale, "รวมภาษีที่หัก", "Total tax")} ${formatMoney(certificate.taxAmount, locale)}`, { size: 13, weight: "bold" });
  const words = thai ? bahtText(certificate.taxAmount) : bahtTextEn(certificate.taxAmount);
  sheet.text(`(${words})`, { size: 10, color: muted });
  sheet.text(tr(locale, "ผู้จ่ายเงินได้หักภาษี ณ ที่จ่าย", "The payer withheld tax at source."), { size: 10 });
  return sheet.bytes();
}
