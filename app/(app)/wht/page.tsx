import Link from "next/link";
import { Badge } from "@/components/badge";
import { prisma } from "@/lib/db";
import { contactName, formatDate, formatMoney, isPeriod, statusLabel, statusTone } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

export default async function WhtPage({ searchParams }: { searchParams: Promise<{ period?: string; status?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const period = query.period && isPeriod(query.period) ? query.period : "";
  const status = query.status === "draft" || query.status === "confirmed" ? query.status : "";
  const certificates = await prisma.whtCertificate.findMany({
    where: {
      companyId: company.id,
      ...(status ? { status } : {}),
      ...(period ? { paymentDate: { startsWith: period } } : {}),
    },
    include: { expense: { include: { contact: true } } },
    orderBy: [{ paymentDate: "desc" }, { number: "desc" }],
  });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "หนังสือรับรองหัก ณ ที่จ่าย", "Withholding certificates")}</h1>
          <p className="lede">{tr(locale, "สร้างจากค่าใช้จ่ายที่จ่ายแล้ว ฉบับร่างยังไม่เข้า ภ.ง.ด. จนกว่าจะยืนยัน", "Created from paid expenses. Drafts stay out of the PND return until confirmed.")}</p>
        </div>
      </div>
      <form className="filters" method="get">
        <input type="month" name="period" defaultValue={period} />
        <select name="status" defaultValue={status}>
          <option value="">{tr(locale, "ทุกสถานะ", "All statuses")}</option>
          <option value="draft">{tr(locale, "ร่าง", "Draft")}</option>
          <option value="confirmed">{tr(locale, "ยืนยันแล้ว", "Confirmed")}</option>
        </select>
        <button className="btn btn-ghost" type="submit">
          {tr(locale, "กรอง", "Filter")}
        </button>
      </form>
      <section className="card">
        {certificates.length === 0 ? (
          <p className="muted">{tr(locale, "ยังไม่มีหนังสือรับรอง จ่ายรายการที่มีการหักภาษีก่อน", "No certificates yet. Pay an expense that withholds tax.")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "เลขที่", "No.")}</th>
                  <th>{tr(locale, "ผู้ถูกหัก", "Payee")}</th>
                  <th>{tr(locale, "แบบ", "Form")}</th>
                  <th>{tr(locale, "วันที่จ่าย", "Paid")}</th>
                  <th className="num">{tr(locale, "เงินได้", "Income")}</th>
                  <th className="num">{tr(locale, "ภาษี", "Tax")}</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((certificate) => (
                  <tr key={certificate.id}>
                    <td>
                      <Link href={`/wht/${certificate.id}`}>{certificate.number}</Link>{" "}
                      <Badge tone={statusTone(certificate.status)}>{statusLabel(certificate.status, locale)}</Badge>
                    </td>
                    <td>{contactName(certificate.expense.contact, locale)}</td>
                    <td>{certificate.formType === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"}</td>
                    <td>{formatDate(certificate.paymentDate, locale)}</td>
                    <td className="num">{formatMoney(certificate.baseAmount, locale)}</td>
                    <td className="num">{formatMoney(certificate.taxAmount, locale)}</td>
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
