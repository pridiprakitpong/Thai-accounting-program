import Link from "next/link";
import { Badge } from "@/components/badge";
import { categoryLabel } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { contactName, formatDate, formatMoney, isPeriod, statusLabel, statusTone } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ period?: string; status?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const period = query.period && isPeriod(query.period) ? query.period : "";
  const status = query.status === "paid" || query.status === "unpaid" ? query.status : "";
  const expenses = await prisma.expense.findMany({
    where: {
      companyId: company.id,
      ...(status ? { status } : { status: { not: "void" } }),
      ...(period ? { billDate: { gte: `${period}-01`, lte: `${period}-31` } } : {}),
    },
    include: { contact: true },
    orderBy: [{ billDate: "desc" }, { number: "desc" }],
  });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "ค่าใช้จ่าย", "Expenses")}</h1>
          <p className="lede">{tr(locale, "บิลซื้อพร้อมใบกำกับภาษี ภาษีซื้อ และหัก ณ ที่จ่ายรายบรรทัด", "Purchase bills with a tax invoice, input VAT, and withholding tax per line.")}</p>
        </div>
        <Link className="btn btn-primary" href="/expenses/new">
          {tr(locale, "บันทึกค่าใช้จ่าย", "New expense")}
        </Link>
      </div>
      <form className="filters" method="get">
        <input type="month" name="period" defaultValue={period} />
        <select name="status" defaultValue={status}>
          <option value="">{tr(locale, "ไม่รวมที่ยกเลิก", "Hide void")}</option>
          <option value="unpaid">{tr(locale, "ยังไม่จ่าย", "Unpaid")}</option>
          <option value="paid">{tr(locale, "จ่ายแล้ว", "Paid")}</option>
        </select>
        <button className="btn btn-ghost" type="submit">
          {tr(locale, "กรอง", "Filter")}
        </button>
      </form>
      <section className="card">
        {expenses.length === 0 ? (
          <p className="muted">{tr(locale, "ยังไม่มีค่าใช้จ่าย", "No expenses yet.")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "เลขที่", "No.")}</th>
                  <th>{tr(locale, "ผู้ขาย", "Vendor")}</th>
                  <th>{tr(locale, "วันที่บิล", "Bill")}</th>
                  <th>{tr(locale, "ใบกำกับ", "Tax invoice")}</th>
                  <th className="num">VAT</th>
                  <th className="num">{tr(locale, "หัก ณ ที่จ่าย", "WHT")}</th>
                  <th className="num">{tr(locale, "จ่ายสุทธิ", "Net")}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <Link href={`/expenses/${expense.id}`}>{expense.number}</Link>
                      <div className="muted">{categoryLabel(expense.category, locale)}</div>
                    </td>
                    <td>{contactName(expense.contact, locale)}</td>
                    <td>{formatDate(expense.billDate, locale)}</td>
                    <td>
                      {expense.taxInvoiceNo}
                      <div className="muted">{formatDate(expense.taxInvoiceDate, locale)}</div>
                      <Badge tone={statusTone(expense.status)}>{statusLabel(expense.status, locale)}</Badge>
                    </td>
                    <td className="num">{formatMoney(expense.vatAmount, locale)}</td>
                    <td className="num">{formatMoney(expense.whtAmount, locale)}</td>
                    <td className="num">{formatMoney(expense.netPayable, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
