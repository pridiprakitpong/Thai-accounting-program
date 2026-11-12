import Link from "next/link";
import { SalesForm } from "@/components/sales-form";
import { createSales } from "@/lib/actions/sales";
import { prisma } from "@/lib/db";
import { contactName, todayBangkok } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

export default async function NewSalesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { company, locale } = await pageContext();
  const query = await searchParams;
  const type = query.type === "invoice" || query.type === "tax_invoice" || query.type === "quotation" ? query.type : "tax_invoice";
  const contacts = await prisma.contact.findMany({
    where: { companyId: company.id, role: { in: ["customer", "both"] } },
    orderBy: { nameTh: "asc" },
  });
  if (contacts.length === 0) {
    return (
      <div className="card">
        <p>{tr(locale, "เพิ่มลูกค้าก่อนออกเอกสาร", "Add a customer before issuing a document.")}</p>
        <Link className="btn btn-primary" href="/contacts/new">
          {tr(locale, "เพิ่มผู้ติดต่อ", "Add contact")}
        </Link>
      </div>
    );
  }
  return (
    <div className="stack">
      <div className="page-head">
        <h1>{tr(locale, "เอกสารขายใหม่", "New sales document")}</h1>
      </div>
      <section className="card">
        <SalesForm
          locale={locale}
          contacts={contacts.map((contact) => ({ id: contact.id, name: contactName(contact, locale) }))}
          action={createSales}
          submitLabel={tr(locale, "ออกเอกสาร", "Issue document")}
          initial={{
            type,
            contactId: contacts[0].id,
            issueDate: todayBangkok(),
            dueDate: "",
            vatMode: "exclusive",
            remarks: "",
            lines: [{ description: "", quantity: "1", unitPrice: "" }],
          }}
        />
      </section>
    </div>
  );
}
