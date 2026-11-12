import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { confirmCertificate, revertCertificate } from "@/lib/actions/wht";
import { incomeType } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { branchLabel, contactName, formatDate, formatMoney, formatMonthLabel, statusLabel, statusTone } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";
import { formatTaxId } from "@/lib/tax/tax-id";

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { company, locale } = await pageContext();
  const { id } = await params;
  const query = await searchParams;
  const certificate = await prisma.whtCertificate.findFirst({
    where: { id, companyId: company.id },
    include: { expense: { include: { contact: true, lines: { orderBy: { position: "asc" } } } } },
  });
  if (!certificate) notFound();
  const contact = certificate.expense.contact;
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{certificate.number}</h1>
          <p className="lede">
            {tr(locale, "หนังสือรับรองการหักภาษี ณ ที่จ่าย มาตรา 50 ทวิ", "Withholding tax certificate, section 50 bis")} · {certificate.formType === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"}{" "}
            <Badge tone={statusTone(certificate.status)}>{statusLabel(certificate.status, locale)}</Badge>
          </p>
        </div>
        <div className="actions">
          <a className="btn btn-ghost" href={`/api/wht/${certificate.id}/pdf?lang=th`}>
            PDF ไทย
          </a>
          <a className="btn btn-ghost" href={`/api/wht/${certificate.id}/pdf?lang=en`}>
            PDF English
          </a>
        </div>
      </div>
      {query.error ? <div className="alert">{tr(locale, "ยืนยันได้เฉพาะรายการที่จ่ายแล้ว", "Only a paid expense can be confirmed.")}</div> : null}
      <section className="callout">
        <div>
          <div className="muted">{tr(locale, "ผู้มีหน้าที่หักภาษี", "Payer")}</div>
          <strong>{locale === "en" ? company.nameEn : company.nameTh}</strong>
          <div>{formatTaxId(company.taxId)} · {branchLabel(company.branchCode, locale)}</div>
        </div>
        <div>
          <div className="muted">{tr(locale, "ผู้ถูกหักภาษี", "Payee")}</div>
          <strong>{contactName(contact, locale)}</strong>
          <div>{formatTaxId(contact.taxId)} · {branchLabel(contact.branchCode, locale)}</div>
        </div>
      </section>
      <section className="card">
        <p>
          {tr(locale, "วันที่จ่าย", "Payment date")} {formatDate(certificate.paymentDate, locale)} · {tr(locale, "เข้า", "Enters")} {certificate.formType === "pnd3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"}{" "}
          {formatMonthLabel(certificate.paymentDate.slice(0, 7), locale)}
          {certificate.status === "draft" ? tr(locale, " เมื่อยืนยันแล้วเท่านั้น", " only after confirmation") : ""}
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{tr(locale, "ประเภทเงินได้", "Income")}</th>
                <th className="num">{tr(locale, "จำนวนเงิน", "Amount")}</th>
                <th className="num">{tr(locale, "อัตรา", "Rate")}</th>
                <th className="num">{tr(locale, "ภาษี", "Tax")}</th>
              </tr>
            </thead>
            <tbody>
              {certificate.expense.lines.map((line) => {
                const kind = incomeType(line.incomeType);
                return (
                  <tr key={line.id}>
                    <td>
                      {line.description}
                      <div className="muted">{locale === "en" ? kind.en : kind.th} · {kind.section}</div>
                    </td>
                    <td className="num">{formatMoney(line.baseAmount, locale)}</td>
                    <td className="num">{line.whtRate.toFixed(2)}</td>
                    <td className="num">{formatMoney(line.whtAmount, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          <strong>{tr(locale, "รวมภาษีที่หัก", "Total tax withheld")} {formatMoney(certificate.taxAmount, locale)}</strong>
        </p>
        <div className="actions">
          {certificate.status === "draft" ? (
            <form action={confirmCertificate}>
              <input type="hidden" name="id" value={certificate.id} />
              <button className="btn btn-primary" type="submit">
                {tr(locale, "ยืนยันหนังสือรับรอง", "Confirm certificate")}
              </button>
            </form>
          ) : (
            <form action={revertCertificate}>
              <input type="hidden" name="id" value={certificate.id} />
              <button className="btn btn-ghost" type="submit">
                {tr(locale, "กลับเป็นฉบับร่าง", "Return to draft")}
              </button>
            </form>
          )}
          <Link href={`/expenses/${certificate.expenseId}`}>{tr(locale, "เปิดค่าใช้จ่าย", "Open expense")} {certificate.expense.number}</Link>
        </div>
      </section>
    </div>
  );
}
