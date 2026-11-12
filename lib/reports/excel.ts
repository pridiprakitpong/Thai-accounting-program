import ExcelJS from "exceljs";
import type { Locale } from "../i18n";
import { formatMonthLabel } from "../format";
import type { PndForm } from "../tax/pnd";

export async function buildPndWorkbook(input: {
  locale: Locale;
  form: PndForm;
  period: string;
  companyName: string;
  taxId: string;
  totalBase: number;
  totalTax: number;
  rows: {
    number: string;
    payee: string;
    taxId: string;
    paymentDate: string;
    incomeType: string;
    rate: number;
    base: number;
    tax: number;
  }[];
}) {
  const th = input.locale === "th";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bai Khiao Books";
  const formName = input.form === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53";
  const summary = workbook.addWorksheet(th ? "สรุป" : "Summary");
  const pairs: [string, string | number][] = [
    [th ? "แบบ" : "Form", th ? formName : input.form.toUpperCase()],
    [th ? "เดือนที่จ่าย" : "Payment month", formatMonthLabel(input.period, input.locale)],
    [th ? "ผู้มีหน้าที่หักภาษี" : "Payer", input.companyName],
    [th ? "เลขประจำตัวผู้เสียภาษี" : "Tax ID", input.taxId],
    [th ? "จำนวนบรรทัด" : "Lines", input.rows.length],
    [th ? "เงินได้ทั้งสิ้น" : "Total income", input.totalBase / 100],
    [th ? "ภาษีที่หักทั้งสิ้น" : "Total tax withheld", input.totalTax / 100],
  ];
  pairs.forEach((pair, index) => {
    summary.getCell(index + 1, 1).value = pair[0];
    summary.getCell(index + 1, 1).font = { bold: true };
    summary.getCell(index + 1, 2).value = pair[1];
    if (index >= 5) summary.getCell(index + 1, 2).numFmt = "#,##0.00";
  });
  summary.getCell(9, 1).value = th
    ? "เฉพาะหนังสือรับรองที่ยืนยันแล้ว และเฉพาะการจ่ายในเดือนนี้"
    : "Confirmed certificates only, by payment month";
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 42;

  const sheet = workbook.addWorksheet(th ? "ใบแนบ" : "Attachment");
  const header = sheet.addRow(
    th
      ? ["ลำดับ", "เลขหนังสือ", "เลขประจำตัวผู้เสียภาษี", "ชื่อผู้มีเงินได้", "วันที่จ่าย", "ประเภทเงินได้", "อัตรา (%)", "จำนวนเงินที่จ่าย", "ภาษีที่หัก"]
      : ["No.", "Certificate", "Tax ID", "Payee", "Paid on", "Income type", "Rate (%)", "Amount paid", "Tax withheld"],
  );
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E45" } };
  header.alignment = { vertical: "middle" };
  input.rows.forEach((row, index) => {
    const added = sheet.addRow([
      index + 1,
      row.number,
      row.taxId,
      row.payee,
      row.paymentDate,
      row.incomeType,
      row.rate,
      row.base / 100,
      row.tax / 100,
    ]);
    added.getCell(7).numFmt = "0.00";
    added.getCell(8).numFmt = "#,##0.00";
    added.getCell(9).numFmt = "#,##0.00";
  });
  const total = sheet.addRow([
    "",
    "",
    "",
    "",
    "",
    th ? "รวม" : "Total",
    "",
    input.totalBase / 100,
    input.totalTax / 100,
  ]);
  total.font = { bold: true };
  total.getCell(8).numFmt = "#,##0.00";
  total.getCell(9).numFmt = "#,##0.00";
  [8, 18, 22, 36, 16, 28, 12, 20, 18].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
