import Link from "next/link";
import { Badge } from "@/components/badge";
import { MonthSwitch } from "@/components/month-switch";
import { prisma } from "@/lib/db";
import { contactName, currentPeriod, formatDate, formatMoney, formatMonthLabel, isPeriod, statusLabel, statusTone } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { getPp30View } from "@/lib/services/pp30";
import { pageContext } from "@/lib/session";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const period = query.period && isPeriod(query.period) ? query.period : currentPeriod();
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  const [sales, expenses, unpaidSales, unpaidExpenses, pp30] = await Promise.all([
    prisma.salesDocument.findMany({
      where: {
        companyId: company.id,
        status: { not: "void" },
        type: { in: ["invoice", "tax_invoice"] },
        issueDate: { gte: `${period}-01`, lte: `${period}-31` },
      },
    }),
    prisma.expense.findMany({
      where: { companyId: company.id, status: { not: "void" }, billDate: { gte: `${period}-01`, lte: `${period}-31` } },
    }),
    prisma.salesDocument.findMany({
      where: { companyId: company.id, status: "issued", type: { in: ["invoice", "tax_invoice"] } },
      include: { contact: true },
      orderBy: { issueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: { companyId: company.id, status: "unpaid" },
      include: { contact: true },
      orderBy: { billDate: "asc" },
    }),
    getPp30View(company.id, year, month),
  ]);
  const salesTotal = sales.reduce((sum, doc) => sum + doc.total, 0);
  const expenseTotal = expenses.reduce((sum, doc) => sum + doc.total, 0);
  const unpaidSalesTotal = unpaidSales.reduce((sum, doc) => sum + doc.total, 0);
  const unpaidExpenseTotal = unpaidExpenses.reduce((sum, doc) => sum + doc.netPayable, 0);
  const position = pp30.month.vatPayable > 0 ? tr(locale, "ต้องชำระ", "Payable") : pp30.month.excessVat > 0 ? tr(locale, "ชำระเกิน ยกไป", "Excess to carry") : tr(locale, "ไม่มีภาษีต้องชำระ", "Nothing payable");
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "ภาพรวม", "Dashboard")}</h1>
          <p className="lede">
            {tr(
              locale,
              `${formatMonthLabel(period, locale)} — ยอดขายและค่าใช้จ่ายตามวันที่เอกสาร ภาษีมูลค่าเพิ่มตามเดือนในแบบ ภ.พ.30`,
              `${formatMonthLabel(period, locale)} — sales and expenses by document date, VAT by the PP.30 month.`,
            )}
          </p>
        </div>
        <MonthSwitch period={period} locale={locale} path="/dashboard" />
      </div>
      <section className="stat-grid">
        <article className="stat">
          <div className="label">{tr(locale, "ยอดขาย", "Sales")}</div>
          <div className="value">{formatMoney(salesTotal, locale)}</div>
          <div className="hint">{tr(locale, "ใบแจ้งหนี้และใบกำกับภาษี", "Invoices and tax invoices")}</div>
        </article>
        <article className="stat">
          <div className="label">{tr(locale, "ค่าใช้จ่าย", "Expenses")}</div>
          <div className="value">{formatMoney(expenseTotal, locale)}</div>
          <div className="hint">{tr(locale, "ตามวันที่บิล รวม VAT", "By bill date, including VAT")}</div>
        </article>
        <article className="stat">
          <div className="label">{tr(locale, "ลูกหนี้ค้างรับ", "Unpaid sales")}</div>
          <div className="value">{formatMoney(unpaidSalesTotal, locale)}</div>
          <div className="hint">{tr(locale, `${unpaidSales.length} รายการ`, `${unpaidSales.length} open`)}</div>
        </article>
        <article className="stat alert-stat">
          <div className="label">{tr(locale, "เจ้าหนี้ค้างจ่าย", "Unpaid bills")}</div>
          <div className="value">{formatMoney(unpaidExpenseTotal, locale)}</div>
          <div className="hint">{tr(locale, `${unpaidExpenses.length} รายการ`, `${unpaidExpenses.length} open`)}</div>
        </article>
      </section>
      <section className="card vat-banner">
        <div>
          <div className="label">{tr(locale, "ฐานะ ภ.พ.30", "PP.30 position")}</div>
          <div className="value">{formatMoney(pp30.month.vatPayable || pp30.month.excessVat, locale)}</div>
          <div className="hint">{position}</div>
        </div>
        <dl>
          <div>
            <dt>{tr(locale, "ภาษีขาย", "Output VAT")}</dt>
            <dd>{formatMoney(pp30.month.outputVat, locale)}</dd>
          </div>
          <div>
            <dt>{tr(locale, "ภาษีซื้อ", "Input VAT")}</dt>
            <dd>{formatMoney(pp30.month.inputVat, locale)}</dd>
          </div>
          <div>
            <dt>{tr(locale, "ยกมา", "Brought forward")}</dt>
            <dd>{formatMoney(pp30.month.carryIn, locale)}</dd>
          </div>
        </dl>
        <Link className="btn btn-ghost" href={`/reports/pp30?period=${period}`}>
          {tr(locale, "เปิดแบบ", "Open return")}
        </Link>
      </section>
      <p className="muted">
        {tr(
          locale,
          "ภาษีซื้ออ้างอิงวันที่ในใบกำกับภาษี ไม่ใช่วันที่บิล ดังนั้นค่าใช้จ่ายของเดือนนี้อาจไม่เท่ากับภาษีซื้อใน ภ.พ.30",
          "Input VAT uses the tax invoice date, not the bill date, so this month's expenses may not match PP.30 input VAT.",
        )}
      </p>
      <section className="split">
        <article className="card">
          <h2>{tr(locale, "ใบแจ้งหนี้ที่ยังไม่รับเงิน", "Unpaid sales documents")}</h2>
          {unpaidSales.length === 0 ? (
            <p className="muted">{tr(locale, "ไม่มีรายการค้าง", "Nothing outstanding.")}</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{tr(locale, "เลขที่", "No.")}</th>
                    <th>{tr(locale, "ลูกค้า", "Customer")}</th>
                    <th>{tr(locale, "วันที่", "Date")}</th>
                    <th className="num">{tr(locale, "ยอด", "Amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidSales.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <Link href={`/sales/${doc.id}`}>{doc.number}</Link> <Badge tone={statusTone(doc.status)}>{statusLabel(doc.status, locale)}</Badge>
                      </td>
                      <td>{contactName(doc.contact, locale)}</td>
                      <td>{formatDate(doc.issueDate, locale)}</td>
                      <td className="num">{formatMoney(doc.total, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
        <article className="card">
          <h2>{tr(locale, "บิลที่ยังไม่จ่าย", "Unpaid expenses")}</h2>
          {unpaidExpenses.length === 0 ? (
            <p className="muted">{tr(locale, "ไม่มีรายการค้าง", "Nothing outstanding.")}</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{tr(locale, "เลขที่", "No.")}</th>
                    <th className="num">{tr(locale, "จ่ายสุทธิ", "Net")}</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidExpenses.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <Link href={`/expenses/${doc.id}`}>{doc.number}</Link>
                        <div className="muted">{contactName(doc.contact, locale)}</div>
                      </td>
                      <td className="num">{formatMoney(doc.netPayable, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
