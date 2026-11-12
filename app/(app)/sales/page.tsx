import Link from "next/link";
import { Badge } from "@/components/badge";
import { prisma } from "@/lib/db";
import { contactName, formatDate, formatMoney, isPeriod, statusLabel, statusTone } from "@/lib/format";
import { salesTypeLabel } from "@/lib/constants";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ type?: string; period?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const type = ["quotation", "invoice", "tax_invoice"].includes(query.type ?? "") ? query.type : "";
  const period = query.period && isPeriod(query.period) ? query.period : "";
  const documents = await prisma.salesDocument.findMany({
    where: {
      companyId: company.id,
      ...(type ? { type } : {}),
      ...(period ? { issueDate: { gte: `${period}-01`, lte: `${period}-31` } } : {}),
    },
    include: { contact: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
  });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "เอกสารขาย", "Sales")}</h1>
          <p className="lede">{tr(locale, "ใบเสนอราคา ใบแจ้งหนี้ และใบกำกับภาษี เลขที่รันต่อปี", "Quotations, invoices, and tax invoices, numbered by year.")}</p>
        </div>
        <Link className="btn btn-primary" href="/sales/new">
          {tr(locale, "สร้างเอกสาร", "New document")}
        </Link>
      </div>
      <form className="filters" method="get">
        <select name="type" defaultValue={type ?? ""}>
          <option value="">{tr(locale, "ทุกประเภท", "All types")}</option>
          <option value="quotation">{tr(locale, "ใบเสนอราคา", "Quotation")}</option>
          <option value="invoice">{tr(locale, "ใบแจ้งหนี้", "Invoice")}</option>
          <option value="tax_invoice">{tr(locale, "ใบกำกับภาษี", "Tax invoice")}</option>
        </select>
        <input type="month" name="period" defaultValue={period} />
        <button className="btn btn-ghost" type="submit">
          {tr(locale, "กรอง", "Filter")}
        </button>
      </form>
      <section className="card">
        {documents.length === 0 ? (
          <p className="muted">{tr(locale, "ยังไม่มีเอกสาร", "No documents yet.")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "เลขที่", "No.")}</th>
                  <th>{tr(locale, "ประเภท", "Type")}</th>
                  <th>{tr(locale, "ลูกค้า", "Customer")}</th>
                  <th>{tr(locale, "วันที่", "Date")}</th>
                  <th className="num">VAT</th>
                  <th className="num">{tr(locale, "รวม", "Total")}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link href={`/sales/${doc.id}`}>{doc.number}</Link>
                    </td>
                    <td>
                      {salesTypeLabel(doc.type, locale)} <Badge tone={statusTone(doc.status)}>{statusLabel(doc.status, locale)}</Badge>
                    </td>
                    <td>{contactName(doc.contact, locale)}</td>
                    <td>{formatDate(doc.issueDate, locale)}</td>
                    <td className="num">{formatMoney(doc.vatAmount, locale)}</td>
                    <td className="num">{formatMoney(doc.total, locale)}</td>
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
