import { CompanyForm } from "@/components/company-form";
import { createBankAccount, deleteBankAccount, updateCompany } from "@/lib/actions/company";
import { formatTaxId } from "@/lib/tax/tax-id";
import { tr } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { pageContext } from "@/lib/session";

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const banks = await prisma.bankAccount.findMany({ where: { companyId: company.id }, orderBy: { bankName: "asc" } });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "บริษัท", "Company")}</h1>
          <p className="lede">
            {tr(locale, "หนึ่งบริษัทต่อการเข้าสู่ระบบ ข้อมูลทุกแถวผูกกับบริษัทเพื่อรองรับหลายบริษัทในภายหลัง", "One company per sign-in. Every row belongs to a company so more companies can be added later.")}{" "}
            {formatTaxId(company.taxId)}
          </p>
        </div>
      </div>
      {query.saved ? <div className="oknote">{tr(locale, "บันทึกแล้ว", "Saved.")}</div> : null}
      {query.error ? <div className="alert">{tr(locale, "กรอกชื่อธนาคาร ชื่อบัญชี และเลขบัญชี", "Enter the bank, account name, and number.")}</div> : null}
      <section className="card">
        <CompanyForm locale={locale} action={updateCompany} initial={company} />
      </section>
      <section className="card stack">
        <h2>{tr(locale, "บัญชีธนาคาร", "Bank accounts")}</h2>
        {banks.length === 0 ? <p className="muted">{tr(locale, "ยังไม่มีบัญชีสำหรับบันทึกการจ่าย", "No account yet for marking bills paid.")}</p> : null}
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {banks.map((bank) => (
                <tr key={bank.id}>
                  <td>
                    <strong>{bank.bankName}</strong>
                    <div className="muted">
                      {bank.accountName} · {bank.accountNumber}
                    </div>
                  </td>
                  <td className="num">
                    <form action={deleteBankAccount}>
                      <input type="hidden" name="id" value={bank.id} />
                      <button className="btn btn-danger" type="submit">
                        {tr(locale, "ลบ", "Delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={createBankAccount} className="form-grid">
          <label className="field">
            <span>{tr(locale, "ธนาคาร", "Bank")}</span>
            <input name="bankName" required />
          </label>
          <label className="field">
            <span>{tr(locale, "ชื่อบัญชี", "Account name")}</span>
            <input name="accountName" required />
          </label>
          <label className="field">
            <span>{tr(locale, "เลขบัญชี", "Account number")}</span>
            <input name="accountNumber" required />
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn btn-primary" type="submit">
              {tr(locale, "เพิ่มบัญชี", "Add account")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
