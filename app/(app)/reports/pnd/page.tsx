import Link from "next/link";
import { MonthSwitch } from "@/components/month-switch";
import { currentPeriod, formatDate, formatMoney, formatMonthLabel, isPeriod } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { getPndMonth } from "@/lib/services/pnd";
import { pageContext } from "@/lib/session";
import type { PndForm } from "@/lib/tax/pnd";

export default async function PndPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const period = query.period && isPeriod(query.period) ? query.period : currentPeriod();
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  const [pnd53, pnd3] = await Promise.all([
    getPndMonth(company.id, "pnd53", year, month),
    getPndMonth(company.id, "pnd3", year, month),
  ]);
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "ภ.ง.ด.3 และ ภ.ง.ด.53", "PND3 and PND53")}</h1>
          <p className="lede">
            {tr(
              locale,
              `${formatMonthLabel(period, locale)} รวมเฉพาะหนังสือรับรองที่ยืนยันแล้ว ตามเดือนที่จ่ายเงิน นิติบุคคลอยู่ ภ.ง.ด.53 บุคคลธรรมดาอยู่ ภ.ง.ด.3`,
              `${formatMonthLabel(period, locale)} includes confirmed certificates only, by the month the money was paid. Companies are PND53 and individuals are PND3.`,
            )}
          </p>
        </div>
        <MonthSwitch period={period} locale={locale} path="/reports/pnd" />
      </div>
      <PndBlock locale={locale} title="ภ.ง.ด.53" form="pnd53" period={period} report={pnd53} />
      <PndBlock locale={locale} title="ภ.ง.ด.3" form="pnd3" period={period} report={pnd3} />
    </div>
  );
}

function PndBlock({
  locale,
  title,
  form,
  period,
  report,
}: {
  locale: "th" | "en";
  title: string;
  form: PndForm;
  period: string;
  report: Awaited<ReturnType<typeof getPndMonth>>;
}) {
  return (
    <section className="card stack">
      <div className="page-head">
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="muted">
            {tr(locale, "เงินได้", "Income")} {formatMoney(report.file.totalBase, locale)} · {tr(locale, "ภาษี", "Tax")} {formatMoney(report.file.totalTax, locale)}
            {report.draftCount > 0
              ? ` · ${tr(locale, `มีฉบับร่าง ${report.draftCount} ฉบับที่ยังไม่รวม`, `${report.draftCount} draft certificate(s) are not included`)}`
              : ""}
          </p>
        </div>
        <div className="actions">
          <a className="btn btn-ghost" href={`/api/reports/pnd/export?form=${form}&period=${period}&format=txt`}>
            TXT
          </a>
          <a className="btn btn-ghost" href={`/api/reports/pnd/export?form=${form}&period=${period}&format=xlsx`}>
            Excel
          </a>
        </div>
      </div>
      {report.rows.length === 0 ? <p className="muted">{tr(locale, "ไม่มีรายการที่ยืนยันในเดือนนี้", "No confirmed items this month.")}</p> : null}
      {report.rows.length > 0 ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{tr(locale, "หนังสือ", "Certificate")}</th>
                <th>{tr(locale, "ผู้มีเงินได้", "Payee")}</th>
                <th>{tr(locale, "วันที่จ่าย", "Paid")}</th>
                <th>{tr(locale, "ประเภท", "Type")}</th>
                <th className="num">{tr(locale, "เงินได้", "Income")}</th>
                <th className="num">{tr(locale, "ภาษี", "Tax")}</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={`${row.certificateId}-${index}`}>
                  <td>
                    <Link href={`/wht/${row.certificateId}`}>{row.number}</Link>
                  </td>
                  <td>
                    {row.payee}
                    <div className="muted">{row.taxId}</div>
                  </td>
                  <td>{formatDate(row.paymentDate, locale)}</td>
                  <td>{row.incomeType}</td>
                  <td className="num">{formatMoney(row.base, locale)}</td>
                  <td className="num">{formatMoney(row.tax, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
