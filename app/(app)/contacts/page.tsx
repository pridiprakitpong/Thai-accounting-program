import Link from "next/link";
import { Badge } from "@/components/badge";
import { prisma } from "@/lib/db";
import { branchLabel, contactName } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";
import { formatTaxId } from "@/lib/tax/tax-id";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const role = query.role ?? "";
  const contacts = await prisma.contact.findMany({
    where: {
      companyId: company.id,
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { nameTh: { contains: q } },
              { nameEn: { contains: q } },
              { lastNameTh: { contains: q } },
              { taxId: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { nameTh: "asc" },
  });
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "ผู้ติดต่อ", "Contacts")}</h1>
          <p className="lede">{tr(locale, "ลูกค้าและผู้ขาย พร้อมเลขประจำตัวผู้เสียภาษีและสำนักงานใหญ่หรือสาขา", "Customers and vendors, with tax ID and head office or branch.")}</p>
        </div>
        <Link className="btn btn-primary" href="/contacts/new">
          {tr(locale, "เพิ่มผู้ติดต่อ", "Add contact")}
        </Link>
      </div>
      <form className="filters" method="get">
        <input name="q" defaultValue={q} placeholder={tr(locale, "ค้นชื่อหรือเลขผู้เสียภาษี", "Search name or tax ID")} />
        <select name="role" defaultValue={role}>
          <option value="">{tr(locale, "ทั้งหมด", "All")}</option>
          <option value="customer">{tr(locale, "ลูกค้า", "Customers")}</option>
          <option value="vendor">{tr(locale, "ผู้ขาย", "Vendors")}</option>
          <option value="both">{tr(locale, "ทั้งสอง", "Both")}</option>
        </select>
        <button className="btn btn-ghost" type="submit">
          {tr(locale, "กรอง", "Filter")}
        </button>
      </form>
      <section className="card">
        {contacts.length === 0 ? (
          <p className="muted">{tr(locale, "ไม่พบผู้ติดต่อ", "No contacts.")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{tr(locale, "ชื่อ", "Name")}</th>
                  <th>{tr(locale, "ประเภท", "Type")}</th>
                  <th>{tr(locale, "เลขผู้เสียภาษี", "Tax ID")}</th>
                  <th>{tr(locale, "สาขา", "Branch")}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Link href={`/contacts/${contact.id}`}>{contactName(contact, locale)}</Link>
                    </td>
                    <td>
                      <Badge tone={contact.partyType === "individual" ? "info" : "ok"}>
                        {contact.partyType === "individual" ? tr(locale, "บุคคลธรรมดา", "Individual") : tr(locale, "นิติบุคคล", "Juristic")}
                      </Badge>{" "}
                      <span className="muted">
                        {contact.role === "customer" ? tr(locale, "ลูกค้า", "Customer") : contact.role === "vendor" ? tr(locale, "ผู้ขาย", "Vendor") : tr(locale, "ทั้งสอง", "Both")}
                      </span>
                    </td>
                    <td>{formatTaxId(contact.taxId)}</td>
                    <td>{branchLabel(contact.branchCode, locale)}</td>
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
