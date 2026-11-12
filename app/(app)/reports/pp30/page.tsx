import Link from "next/link";
import { MonthSwitch } from "@/components/month-switch";
import { savePp30 } from "@/lib/actions/pp30";
import { prisma } from "@/lib/db";
import { contactName, currentPeriod, formatDate, formatMoney, formatMonthLabel, isPeriod } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { getPp30View } from "@/lib/services/pp30";
import { pageContext } from "@/lib/session";

export default async function Pp30Page({ searchParams }: { searchParams: Promise<{ period?: string; saved?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const period = query.period && isPeriod(query.period) ? query.period : currentPeriod();
  const view = await getPp30View(company.id, Number(period.slice(0, 4)), Number(period.slice(5, 7)));
  const previous = await prisma.pp30Return.findMany({
    where: { companyId: company.id },
    orderBy: { period: "desc" },
    take: 6,
  });
  const current = view.month;
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "ภ.พ.30", "PP.30")}</h1>
          <p className="lede">
            {tr(
              locale,
              "ภาษีขายจากใบกำกับภาษีที่ออกในเดือนนี้ ภาษีซื้อจากวันที่ในใบกำกับของผู้ขาย ยอดชำระเกินยกไปเดือนถัดไป และเอกสารหนึ่งฉบับอยู่ได้เดือนเดียว",
              "Output VAT from tax invoices issued this month. Input VAT from the vendor tax-invoice date. Excess carries forward, and a document can belong to only one month.",
            )}
          </p>
        </div>
        <MonthSwitch period={period} locale={locale} path="/reports/pp30" />
      </div>
      {query.saved ? <div className="oknote">{tr(locale, "บันทึกร่างแล้ว เอกสารในเดือนนี้ถูกล็อกไว้กับร่างนี้", "Draft saved. Documents in this month are locked to it.")}</div> : null}
      {view.stale ? (
        <div className="notice">
          {tr(
            locale,
            "ร่างที่บันทึกไว้ไม่ตรงกับเอกสารปัจจุบัน อัปเดตร่างเพื่อให้ยอดและรายการตรงกัน",
            "The saved draft no longer matches the documents. Update it so the totals and the list agree.",
          )}
        </div>
      ) : null}
      <section className="stat-grid">
        <article className="stat">
          <div className="label">{tr(locale, "ภาษีขาย", "Output VAT")}</div>
          <div className="value">{formatMoney(current.outputVat, locale)}</div>
          <div className="hint">{current.outputIds.length} {tr(locale, "ฉบับ", "documents")}</div>
        </article>
        <article className="stat">
          <div className="label">{tr(locale, "ภาษีซื้อ", "Input VAT")}</div>
          <div className="value">{formatMoney(current.inputVat, locale)}</div>
          <div className="hint">{current.inputIds.length} {tr(locale, "ฉบับ", "documents")}</div>
        </article>
        <article className="stat">
          <div className="label">{tr(locale, "ยกมา", "Brought forward")}</div>
          <div className="value">{formatMoney(current.carryIn, locale)}</div>
        </article>
        <article className="stat alert-stat">
          <div className="label">{current.vatPayable > 0 ? tr(locale, "ต้องชำระ", "Payable") : tr(locale, "ชำระเกิน", "Excess")}</div>
          <div className="value">{formatMoney(current.vatPayable || current.excessVat, locale)}</div>
          <div className="hint">{current.excessVat > 0 ? tr(locale, "ยกไปเดือนถัดไป", "Carries to next month") : formatMonthLabel(period, locale)}</div>
        </article>
      </section>
      <form action={savePp30}>
        <input type="hidden" name="period" value={period} />
        <button className="btn btn-primary" type="submit">
          {view.saved ? tr(locale, "อัปเดตร่าง", "Update draft") : tr(locale, "บันทึกร่าง", "Save draft")}
        </button>
        {view.saved ? (
          <span className="muted" style={{ marginLeft: 12 }}>
            {tr(locale, "บันทึกล่าสุด", "Last saved")} {view.saved.savedAt.toLocaleString(locale === "th" ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok" })}
          </span>
        ) : (
          <span className="muted" style={{ marginLeft: 12 }}>
            {tr(locale, "ยอดด้านบนเป็นยอดปัจจุบัน ยังไม่ล็อกเอกสาร", "The figures above are current and do not lock the documents yet.")}
          </span>
        )}
      </form>
      <section className="split">
        <article className="card">
          <h2>{tr(locale, "ภาษีขาย", "Output VAT")}</h2>
          {view.outputDocs.length === 0 ? <p className="muted">{tr(locale, "ไม่มีใบกำกับภาษีในเดือนนี้", "No sales tax invoices this month.")}</p> : null}
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {view.outputDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link href={`/sales/${doc.id}`}>{doc.number}</Link>
                      <div className="muted">{contactName(doc.contact, locale)} · {formatDate(doc.issueDate, locale)}</div>
                    </td>
                    <td className="num">{formatMoney(doc.vatAmount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="card">
          <h2>{tr(locale, "ภาษีซื้อ", "Input VAT")}</h2>
          {view.inputDocs.length === 0 ? <p className="muted">{tr(locale, "ไม่มีใบกำกับซื้อในเดือนนี้", "No purchase tax invoices this month.")}</p> : null}
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {view.inputDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link href={`/expenses/${doc.id}`}>{doc.number}</Link>
                      <div className="muted">
                        {contactName(doc.contact, locale)} · {doc.taxInvoiceNo}
                        <br />
                        {tr(locale, "ใบกำกับ", "Tax invoice")} {formatDate(doc.taxInvoiceDate, locale)} · {tr(locale, "บิล", "Bill")} {formatDate(doc.billDate, locale)}
                      </div>
                    </td>
                    <td className="num">{formatMoney(doc.vatAmount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      {previous.length > 0 ? (
        <section className="card">
          <h2>{tr(locale, "ร่างที่บันทึกไว้", "Saved drafts")}</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "เดือน", "Month")}</th>
                  <th className="num">{tr(locale, "ขาย", "Output")}</th>
                  <th className="num">{tr(locale, "ซื้อ", "Input")}</th>
                  <th className="num">{tr(locale, "ต้องชำระ", "Payable")}</th>
                  <th className="num">{tr(locale, "ชำระเกิน", "Excess")}</th>
                </tr>
              </thead>
              <tbody>
                {previous.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/reports/pp30?period=${row.period}`}>{formatMonthLabel(row.period, locale)}</Link>
                    </td>
                    <td className="num">{formatMoney(row.outputVat, locale)}</td>
                    <td className="num">{formatMoney(row.inputVat, locale)}</td>
                    <td className="num">{formatMoney(row.vatPayable, locale)}</td>
                    <td className="num">{formatMoney(row.excessVat, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
