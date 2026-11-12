import { categoryLabel, incomeType, salesTypeLabel, vatModeLabel } from "../constants";
import { branchLabel, contactName, formatDate, formatMoney, type NameParts } from "../format";
import type { Locale } from "../i18n";
import { tr } from "../i18n";
import { bahtText, bahtTextEn } from "../tax/baht-text";
import { formatTaxId } from "../tax/tax-id";
import { formatQuantity } from "../tax/money";
import { pdfDocument } from "./render";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const css = `
  h1{font-size:22px;line-height:1.2;margin:0}
  .top{display:flex;justify-content:space-between;gap:24px}
  .brand{font-size:18px;font-weight:700}
  .muted{color:#5e564c}
  .kicker{color:#1b5e45;font-weight:700;letter-spacing:.08em;font-size:11px}
  .doc{text-align:right;min-width:240px}
  .meta{margin-top:8px;margin-left:auto;border-collapse:collapse}
  .meta td{padding:2px 0 2px 12px}
  .party{margin:18px 0;padding:12px 14px;background:#f7f3ea;border-radius:10px}
  table.lines{width:100%;border-collapse:collapse;margin-top:8px}
  table.lines th{text-align:left;font-size:12px;color:#5e564c;border-bottom:1px solid #d9d0c2;padding:6px 4px}
  table.lines td{border-bottom:1px solid #eee6d8;padding:7px 4px;vertical-align:top}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .totals{width:280px;margin-left:auto;margin-top:12px;border-collapse:collapse}
  .totals td{padding:4px 0}
  .grand td{font-weight:700;font-size:16px;border-top:1px solid #1c1915;padding-top:8px}
  .words{margin-top:8px;color:#3d3832}
  .signs{display:flex;justify-content:space-between;margin-top:42px}
  .sign{width:42%;text-align:center}
  .line{margin:36px 16px 6px;border-top:1px solid #1c1915}
  .void{position:fixed;inset:40%;transform:rotate(-18deg);border:4px solid #8d2f2f;color:#8d2f2f;font-size:42px;font-weight:700;text-align:center;opacity:.35}
  .box{border:1px solid #1c1915;border-radius:8px;padding:10px 12px;margin-top:10px}
  .grid2{display:flex;gap:10px}
  .grid2 .box{flex:1}
  h2{font-size:16px;margin:0 0 4px}
`;

export function salesPdfHtml(input: {
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
}) {
  const { locale, company, contact, document } = input;
  const thai = locale === "th";
  const companyName = thai || !company.nameEn ? company.nameTh : company.nameEn;
  const address = thai || !company.addressEn ? company.addressTh : company.addressEn;
  const customer = contactName(contact, locale);
  const customerAddress = thai || !contact.addressEn ? contact.addressTh : contact.addressEn;
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
  const subtitle = thai
    ? document.type === "quotation"
      ? "QUOTATION"
      : document.type === "invoice"
        ? "INVOICE"
        : paidReceipt
          ? "TAX INVOICE / RECEIPT"
          : "TAX INVOICE"
    : salesTypeLabel(document.type, "th");
  const words = thai ? bahtText(document.total) : bahtTextEn(document.total);
  const rows = document.lines
    .map(
      (line, index) => `<tr>
        <td>${index + 1}</td>
        <td>${esc(line.description)}</td>
        <td class="num">${formatQuantity(line.quantity)}</td>
        <td class="num">${formatMoney(line.unitPrice, locale)}</td>
        <td class="num">${formatMoney(line.amount, locale)}</td>
      </tr>`,
    )
    .join("");
  const vatRow =
    document.vatMode === "none"
      ? ""
      : `<tr><td>${tr(locale, "ภาษีมูลค่าเพิ่ม 7%", "VAT 7%")}</td><td class="num">${formatMoney(document.vatAmount, locale)}</td></tr>`;
  const body = `<style>${css}</style>
    ${document.status === "void" ? `<div class="void">${tr(locale, "ยกเลิก", "VOID")}</div>` : ""}
    <div class="top">
      <div>
        <div class="kicker">BAI KHIAO BOOKS</div>
        <div class="brand">${esc(companyName)}</div>
        <div>${esc(address)}</div>
        <div class="muted">${tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")} ${formatTaxId(company.taxId)} · ${esc(branchLabel(company.branchCode, locale))} (${esc(company.branchCode.padStart(5, "0").slice(-5))})</div>
        <div class="muted">${esc([company.phone, company.email].filter(Boolean).join(" · "))}</div>
      </div>
      <div class="doc">
        <h1>${esc(title)}</h1>
        <div class="muted">${esc(subtitle)}</div>
        <table class="meta">
          <tr><td class="muted">${tr(locale, "เลขที่", "No.")}</td><td><strong>${esc(document.number)}</strong></td></tr>
          <tr><td class="muted">${tr(locale, "วันที่", "Date")}</td><td>${esc(formatDate(document.issueDate, locale))}</td></tr>
          ${document.dueDate ? `<tr><td class="muted">${tr(locale, "ครบกำหนด", "Due")}</td><td>${esc(formatDate(document.dueDate, locale))}</td></tr>` : ""}
          <tr><td class="muted">VAT</td><td>${esc(vatModeLabel(document.vatMode, locale))}</td></tr>
        </table>
      </div>
    </div>
    <div class="party">
      <div class="muted">${tr(locale, "ลูกค้า", "Customer")}</div>
      <strong>${esc(customer)}</strong>
      <div>${esc(customerAddress)}</div>
      <div class="muted">${tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")} ${formatTaxId(contact.taxId)} · ${esc(branchLabel(contact.branchCode, locale))}</div>
    </div>
    <table class="lines">
      <thead><tr>
        <th>#</th>
        <th>${tr(locale, "รายการ", "Description")}</th>
        <th class="num">${tr(locale, "จำนวน", "Qty")}</th>
        <th class="num">${tr(locale, "ราคา/หน่วย", "Unit price")}</th>
        <th class="num">${tr(locale, "จำนวนเงิน", "Amount")}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>${tr(locale, "มูลค่าก่อนภาษี", "Amount before VAT")}</td><td class="num">${formatMoney(document.subtotal, locale)}</td></tr>
      ${vatRow}
      <tr class="grand"><td>${tr(locale, "จำนวนเงินรวม", "Total")}</td><td class="num">${formatMoney(document.total, locale)}</td></tr>
    </table>
    <p class="words">(${esc(words)})</p>
    ${document.remarks ? `<p class="muted">${esc(document.remarks)}</p>` : ""}
    <div class="signs">
      <div class="sign"><div class="line"></div>${tr(locale, "ผู้รับเอกสาร", "Received by")}</div>
      <div class="sign"><div class="line"></div>${tr(locale, "ผู้มีอำนาจลงนาม", "Authorized signature")}<div class="muted">${esc(companyName)}</div></div>
    </div>`;
  return pdfDocument(body, thai ? "th" : "en");
}

export function whtPdfHtml(input: {
  locale: Locale;
  company: { nameTh: string; nameEn: string; taxId: string; branchCode: string; addressTh: string; addressEn: string };
  contact: NameParts & { taxId: string; branchCode: string; addressTh: string; addressEn: string; partyType: string };
  certificate: { number: string; status: string; paymentDate: string; formType: string; baseAmount: number; taxAmount: number };
  lines: { description: string; incomeType: string; whtRate: number; baseAmount: number; whtAmount: number; payCondition: string }[];
  category: string;
}) {
  const { locale, company, contact, certificate, lines } = input;
  const thai = locale === "th";
  const payer = thai || !company.nameEn ? company.nameTh : company.nameEn;
  const payee = contactName(contact, locale);
  const rows = lines
    .map((line) => {
      const kind = incomeType(line.incomeType);
      const label = thai ? `${kind.th} (${kind.section})` : `${kind.en} (${kind.section})`;
      return `<tr>
        <td>${esc(line.description)}<div class="muted">${esc(label)}</div></td>
        <td class="num">${esc(formatDate(certificate.paymentDate, locale))}</td>
        <td class="num">${formatMoney(line.baseAmount, locale)}</td>
        <td class="num">${line.whtRate.toFixed(2)}</td>
        <td class="num">${formatMoney(line.whtAmount, locale)}</td>
      </tr>`;
    })
    .join("");
  const body = `<style>${css}</style>
    <div class="kicker">BAI KHIAO BOOKS</div>
    <h1>${thai ? "หนังสือรับรองการหักภาษี ณ ที่จ่าย" : "Withholding tax certificate"}</h1>
    <div class="muted">${thai ? "ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร" : "Section 50 bis of the Revenue Code"} · ${certificate.formType === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"} · ${esc(certificate.number)}</div>
    <div class="grid2">
      <div class="box">
        <h2>${tr(locale, "ผู้มีหน้าที่หักภาษี", "Payer")}</h2>
        <div>${esc(payer)}</div>
        <div>${esc(thai || !company.addressEn ? company.addressTh : company.addressEn)}</div>
        <div class="muted">${tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")} ${formatTaxId(company.taxId)} · ${esc(branchLabel(company.branchCode, locale))}</div>
      </div>
      <div class="box">
        <h2>${tr(locale, "ผู้ถูกหักภาษี", "Payee")}</h2>
        <div>${esc(payee)}</div>
        <div>${esc(thai || !contact.addressEn ? contact.addressTh : contact.addressEn)}</div>
        <div class="muted">${tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")} ${formatTaxId(contact.taxId)} · ${esc(branchLabel(contact.branchCode, locale))}</div>
      </div>
    </div>
    <p class="muted">${tr(locale, "หมวดค่าใช้จ่าย", "Category")}: ${esc(categoryLabel(input.category, locale))} · ${tr(locale, "วันที่จ่าย", "Payment date")} ${esc(formatDate(certificate.paymentDate, locale))} · ${certificate.status === "confirmed" ? tr(locale, "ยืนยันแล้ว", "Confirmed") : tr(locale, "ฉบับร่าง", "Draft")}</p>
    <table class="lines">
      <thead><tr>
        <th>${tr(locale, "ประเภทเงินได้", "Income")}</th>
        <th class="num">${tr(locale, "วันที่จ่าย", "Paid")}</th>
        <th class="num">${tr(locale, "จำนวนเงินที่จ่าย", "Amount")}</th>
        <th class="num">${tr(locale, "อัตรา", "Rate")}</th>
        <th class="num">${tr(locale, "ภาษีที่หัก", "Tax")}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>${tr(locale, "รวมเงินที่จ่าย", "Total paid")}</td><td class="num">${formatMoney(certificate.baseAmount, locale)}</td></tr>
      <tr class="grand"><td>${tr(locale, "รวมภาษีที่หัก", "Total tax")}</td><td class="num">${formatMoney(certificate.taxAmount, locale)}</td></tr>
    </table>
    <p class="words">(${esc(thai ? bahtText(certificate.taxAmount) : bahtTextEn(certificate.taxAmount))})</p>
    <p>${tr(locale, "ผู้จ่ายเงินได้หักภาษี ณ ที่จ่าย", "The payer withheld tax at source.")}</p>
    <div class="signs">
      <div class="sign"><div class="line"></div>${tr(locale, "ผู้ถูกหักภาษี", "Payee")}</div>
      <div class="sign"><div class="line"></div>${tr(locale, "ผู้มีหน้าที่หักภาษี", "Payer")}<div class="muted">${esc(payer)}</div></div>
    </div>
    <p class="muted">${tr(locale, "เอกสารนี้จัดทำจากรายจ่ายที่บันทึกในใบเขียว เพื่อใช้เป็นหนังสือรับรองตามแบบ 50 ทวิ", "Prepared from a recorded expense as a section 50 bis certificate.")}</p>`;
  return pdfDocument(body, thai ? "th" : "en");
}
