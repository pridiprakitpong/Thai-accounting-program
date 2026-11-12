import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { copyAsTaxInvoice, markSalesPaid, unlockSalesFromPp30, voidSales } from "@/lib/actions/sales";
import { salesTypeLabel, vatModeLabel } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { branchLabel, contactName, formatDate, formatMoney, formatMonthLabel, statusLabel, statusTone, todayBangkok } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";
import { formatQuantity } from "@/lib/tax/money";
import { formatTaxId } from "@/lib/tax/tax-id";

export default async function SalesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { company, locale } = await pageContext();
  const { id } = await params;
  const query = await searchParams;
  const doc = await prisma.salesDocument.findFirst({
    where: { id, companyId: company.id },
    include: { contact: true, lines: { orderBy: { position: "asc" } } },
  });
  if (!doc) notFound();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{doc.number}</h1>
          <p className="lede">
            {salesTypeLabel(doc.type, locale)} · {formatDate(doc.issueDate, locale)}{" "}
            <Badge tone={statusTone(doc.status)}>{statusLabel(doc.status, locale)}</Badge>
          </p>
        </div>
        <div className="actions">
          <a className="btn btn-ghost" href={`/api/sales/${doc.id}/pdf?lang=th`}>
            PDF ไทย
          </a>
          <a className="btn btn-ghost" href={`/api/sales/${doc.id}/pdf?lang=en`}>
            PDF English
          </a>
          {doc.status !== "void" && !doc.pp30Period ? (
            <Link className="btn btn-ghost" href={`/sales/${doc.id}/edit`}>
              {tr(locale, "แก้ไข", "Edit")}
            </Link>
          ) : null}
        </div>
      </div>
      {query.error ? <div className="alert">{tr(locale, "ทำรายการนี้ไม่ได้", "That action is not available.")}</div> : null}
      {doc.pp30Period ? (
        <div className="notice">
          {tr(locale, "รวมในร่าง ภ.พ.30", "Included in PP.30 draft")} {formatMonthLabel(doc.pp30Period, locale)}.{" "}
          <Link href={`/reports/pp30?period=${doc.pp30Period}`}>{tr(locale, "เปิดแบบ", "Open return")}</Link>
          <form action={unlockSalesFromPp30} className="inline" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={doc.id} />
            <button className="btn btn-ghost" type="submit">
              {tr(locale, "นำออกจากร่าง", "Remove from draft")}
            </button>
          </form>
        </div>
      ) : null}
      <section className="split">
        <article className="card">
          <h2>{contactName(doc.contact, locale)}</h2>
          <p>
            {formatTaxId(doc.contact.taxId)} · {branchLabel(doc.contact.branchCode, locale)}
          </p>
          <p className="muted">{locale === "en" && doc.contact.addressEn ? doc.contact.addressEn : doc.contact.addressTh}</p>
          <p className="muted">{vatModeLabel(doc.vatMode, locale)}</p>
          {doc.remarks ? <p>{doc.remarks}</p> : null}
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "รายการ", "Description")}</th>
                  <th className="num">{tr(locale, "จำนวน", "Qty")}</th>
                  <th className="num">{tr(locale, "ราคา", "Price")}</th>
                  <th className="num">{tr(locale, "จำนวนเงิน", "Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td className="num">{formatQuantity(line.quantity)}</td>
                    <td className="num">{formatMoney(line.unitPrice, locale)}</td>
                    <td className="num">{formatMoney(line.amount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="card stack">
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>{tr(locale, "ก่อนภาษี", "Before VAT")}</span>
            <strong>{formatMoney(doc.subtotal, locale)}</strong>
          </div>
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>VAT 7%</span>
            <strong>{formatMoney(doc.vatAmount, locale)}</strong>
          </div>
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>{tr(locale, "รวม", "Total")}</span>
            <strong style={{ fontSize: 28 }}>{formatMoney(doc.total, locale)}</strong>
          </div>
          {doc.type !== "quotation" && doc.status === "issued" ? (
            <form action={markSalesPaid} className="stack">
              <input type="hidden" name="id" value={doc.id} />
              <label className="field">
                <span>{tr(locale, "วันที่รับเงิน", "Payment date")}</span>
                <input type="date" name="paymentDate" defaultValue={todayBangkok()} required />
              </label>
              <button className="btn btn-primary" type="submit">
                {tr(locale, "บันทึกว่ารับเงินแล้ว", "Mark as paid")}
              </button>
            </form>
          ) : null}
          {doc.paymentDate ? <p className="muted">{tr(locale, "รับเงินเมื่อ", "Paid on")} {formatDate(doc.paymentDate, locale)}</p> : null}
          {doc.status !== "void" ? (
            <form action={copyAsTaxInvoice}>
              <input type="hidden" name="id" value={doc.id} />
              <button className="btn btn-ghost" type="submit">
                {tr(locale, "คัดลอกเป็นใบกำกับภาษี", "Copy as tax invoice")}
              </button>
            </form>
          ) : null}
          {doc.status !== "void" ? (
            <form action={voidSales}>
              <input type="hidden" name="id" value={doc.id} />
              <button className="btn btn-danger" type="submit">
                {tr(locale, "ยกเลิกเอกสาร", "Void")}
              </button>
            </form>
          ) : null}
          {doc.type === "tax_invoice" && doc.vatAmount > 0 ? (
            <p className="muted">
              {tr(locale, "ภาษีขายเข้าเดือน", "Output VAT month")} {formatMonthLabel(doc.pp30Period || doc.issueDate.slice(0, 7), locale)}
            </p>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
