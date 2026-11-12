import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { addExpenseFiles, deleteExpenseFile, markExpensePaid, undoExpensePayment, unlockExpenseFromPp30, voidExpense } from "@/lib/actions/expenses";
import { categoryLabel, incomeType } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { branchLabel, contactName, formatDate, formatMoney, formatMonthLabel, statusLabel, statusTone, todayBangkok } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";
import { formatTaxId } from "@/lib/tax/tax-id";

export default async function ExpenseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { company, locale } = await pageContext();
  const { id } = await params;
  const query = await searchParams;
  const [expense, banks] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, companyId: company.id },
      include: {
        contact: true,
        lines: { orderBy: { position: "asc" } },
        files: { orderBy: { createdAt: "asc" } },
        certificate: true,
        bankAccount: true,
      },
    }),
    prisma.bankAccount.findMany({ where: { companyId: company.id }, orderBy: { bankName: "asc" } }),
  ]);
  if (!expense) notFound();
  const locked = Boolean(expense.pp30Period);
  const confirmed = expense.certificate?.status === "confirmed";
  const editable = expense.status === "unpaid" && !locked && !confirmed;
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{expense.number}</h1>
          <p className="lede">
            {categoryLabel(expense.category, locale)} · <Badge tone={statusTone(expense.status)}>{statusLabel(expense.status, locale)}</Badge>
          </p>
        </div>
        <div className="actions">
          {editable ? (
            <Link className="btn btn-ghost" href={`/expenses/${expense.id}/edit`}>
              {tr(locale, "แก้ไข", "Edit")}
            </Link>
          ) : null}
          {expense.certificate ? (
            <Link className="btn btn-primary" href={`/wht/${expense.certificate.id}`}>
              {tr(locale, "หนังสือรับรอง", "Certificate")} {expense.certificate.number}
            </Link>
          ) : null}
        </div>
      </div>
      {query.error === "file" ? <div className="alert">{tr(locale, "แนบไฟล์ไม่ได้ ใช้ PDF หรือรูป ไม่เกิน 8 MB", "Could not attach the file. Use a PDF or image under 8 MB.")}</div> : null}
      {query.error && query.error !== "file" ? <div className="alert">{tr(locale, "ทำรายการนี้ไม่ได้", "That action is not available.")}</div> : null}
      <section className="callout">
        <div>
          <div className="muted">{tr(locale, "ภาษีซื้อเข้า ภ.พ.30", "Input VAT in PP.30")}</div>
          <strong>
            {expense.vatAmount > 0
              ? formatMonthLabel(expense.pp30Period || expense.taxInvoiceDate.slice(0, 7), locale)
              : tr(locale, "ไม่มีภาษีซื้อ", "No input VAT")}
          </strong>
          <div className="muted">
            {tr(locale, "ตามวันที่ใบกำกับ", "From the tax invoice")} {formatDate(expense.taxInvoiceDate, locale)} · {expense.taxInvoiceNo}
          </div>
        </div>
        <div>
          <div className="muted">{tr(locale, "หัก ณ ที่จ่ายเข้า ภ.ง.ด.", "Withholding tax in PND")}</div>
          <strong>
            {expense.whtAmount <= 0
              ? tr(locale, "ไม่มีการหัก", "No withholding")
              : expense.paymentDate
                ? formatMonthLabel(expense.paymentDate.slice(0, 7), locale)
                : tr(locale, "เมื่อบันทึกการจ่าย", "When the bill is paid")}
          </strong>
          <div className="muted">
            {expense.contact.partyType === "individual" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"} · {tr(locale, "ตามวันที่จ่าย และต้องยืนยันหนังสือรับรอง", "By payment date, and only after the certificate is confirmed")}
          </div>
        </div>
      </section>
      {locked ? (
        <div className="notice">
          {tr(locale, "รายการนี้อยู่ในร่าง ภ.พ.30", "Included in a PP.30 draft")} {formatMonthLabel(expense.pp30Period, locale)}
          <form action={unlockExpenseFromPp30} style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={expense.id} />
            <button className="btn btn-ghost" type="submit">
              {tr(locale, "นำออกจากร่าง", "Remove from draft")}
            </button>
          </form>
        </div>
      ) : null}
      <section className="split">
        <article className="card">
          <h2>{contactName(expense.contact, locale)}</h2>
          <p>
            {formatTaxId(expense.contact.taxId)} · {branchLabel(expense.contact.branchCode, locale)}
          </p>
          <p className="muted">
            {tr(locale, "วันที่บิล", "Bill date")} {formatDate(expense.billDate, locale)}
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "รายการ", "Description")}</th>
                  <th className="num">{tr(locale, "ฐาน", "Base")}</th>
                  <th className="num">{tr(locale, "อัตรา", "Rate")}</th>
                  <th className="num">{tr(locale, "ภาษีหัก", "WHT")}</th>
                </tr>
              </thead>
              <tbody>
                {expense.lines.map((line) => {
                  const kind = incomeType(line.incomeType);
                  return (
                    <tr key={line.id}>
                      <td>
                        {line.description}
                        <div className="muted">{locale === "en" ? kind.en : kind.th} · {kind.section}</div>
                      </td>
                      <td className="num">{formatMoney(line.baseAmount, locale)}</td>
                      <td className="num">{line.whtRate}%</td>
                      <td className="num">{formatMoney(line.whtAmount, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {expense.notes ? <p>{expense.notes}</p> : null}
          <h3>{tr(locale, "หลักฐาน", "Proof")}</h3>
          {expense.files.length === 0 ? <p className="muted">{tr(locale, "ยังไม่มีไฟล์แนบ", "No files attached.")}</p> : null}
          <ul>
            {expense.files.map((file) => (
              <li key={file.id}>
                <a href={`/api/expenses/${expense.id}/files/${file.id}`}>{file.filename}</a>
                <form action={deleteExpenseFile} className="inline">
                  <input type="hidden" name="id" value={expense.id} />
                  <input type="hidden" name="fileId" value={file.id} />
                  <button className="btn btn-quiet" type="submit" style={{ color: "var(--danger)" }}>
                    {tr(locale, "ลบไฟล์", "Remove")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addExpenseFiles} className="inline">
            <input type="hidden" name="id" value={expense.id} />
            <input type="file" name="files" multiple accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" />
            <button className="btn btn-ghost" type="submit">
              {tr(locale, "แนบไฟล์", "Attach")}
            </button>
          </form>
        </article>
        <aside className="card stack">
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>{tr(locale, "ฐาน", "Base")}</span>
            <strong>{formatMoney(expense.subtotal, locale)}</strong>
          </div>
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>VAT {expense.vatRate}%</span>
            <strong>{formatMoney(expense.vatAmount, locale)}</strong>
          </div>
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>{tr(locale, "หัก ณ ที่จ่าย", "WHT")}</span>
            <strong>{formatMoney(expense.whtAmount, locale)}</strong>
          </div>
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span>{tr(locale, "จ่ายสุทธิ", "Net payable")}</span>
            <strong style={{ fontSize: 28 }}>{formatMoney(expense.netPayable, locale)}</strong>
          </div>
          {expense.status === "unpaid" && !confirmed ? (
            banks.length === 0 ? (
              <p>
                <Link href="/company">{tr(locale, "เพิ่มบัญชีธนาคารก่อนบันทึกการจ่าย", "Add a bank account before marking this paid.")}</Link>
              </p>
            ) : (
              <form action={markExpensePaid} className="stack">
                <input type="hidden" name="id" value={expense.id} />
                <label className="field">
                  <span>{tr(locale, "วันที่จ่าย", "Payment date")}</span>
                  <input type="date" name="paymentDate" required defaultValue={todayBangkok()} />
                </label>
                <label className="field">
                  <span>{tr(locale, "บัญชีที่จ่าย", "Bank account")}</span>
                  <select name="bankAccountId" required defaultValue={banks.find((bank) => bank.isDefault)?.id ?? banks[0].id}>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} · {bank.accountNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn btn-primary" type="submit">
                  {tr(locale, "บันทึกว่าจ่ายแล้ว", "Mark as paid")}
                </button>
              </form>
            )
          ) : null}
          {expense.status === "paid" ? (
            <p className="muted">
              {tr(locale, "จ่ายเมื่อ", "Paid on")} {formatDate(expense.paymentDate, locale)}
              {expense.bankAccount ? ` · ${expense.bankAccount.bankName} ${expense.bankAccount.accountNumber}` : ""}
            </p>
          ) : null}
          {expense.status === "paid" && !confirmed ? (
            <form action={undoExpensePayment}>
              <input type="hidden" name="id" value={expense.id} />
              <button className="btn btn-ghost" type="submit">
                {tr(locale, "ยกเลิกการจ่าย", "Undo payment")}
              </button>
            </form>
          ) : null}
          {expense.status !== "void" && !confirmed ? (
            <form action={voidExpense}>
              <input type="hidden" name="id" value={expense.id} />
              <button className="btn btn-danger" type="submit">
                {tr(locale, "ยกเลิกรายการ", "Void")}
              </button>
            </form>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
