import { notFound, redirect } from "next/navigation";
import { SalesForm } from "@/components/sales-form";
import { updateSales } from "@/lib/actions/sales";
import { prisma } from "@/lib/db";
import { contactName } from "@/lib/format";
import { formatQuantity, satangToInput } from "@/lib/tax/money";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";
import type { VatMode } from "@/lib/tax/sales";

export default async function EditSalesPage({ params }: { params: Promise<{ id: string }> }) {
  const { company, locale } = await pageContext();
  const { id } = await params;
  const [doc, contacts] = await Promise.all([
    prisma.salesDocument.findFirst({
      where: { id, companyId: company.id },
      include: { lines: { orderBy: { position: "asc" } } },
    }),
    prisma.contact.findMany({ where: { companyId: company.id, role: { in: ["customer", "both"] } }, orderBy: { nameTh: "asc" } }),
  ]);
  if (!doc) notFound();
  if (doc.status === "void" || doc.pp30Period) redirect(`/sales/${doc.id}`);
  return (
    <div className="stack">
      <div className="page-head">
        <h1>
          {tr(locale, "แก้ไข", "Edit")} {doc.number}
        </h1>
      </div>
      <section className="card">
        <SalesForm
          locale={locale}
          id={doc.id}
          lockType
          contacts={contacts.map((contact) => ({ id: contact.id, name: contactName(contact, locale) }))}
          action={updateSales}
          submitLabel={tr(locale, "บันทึก", "Save")}
          initial={{
            type: doc.type as "quotation" | "invoice" | "tax_invoice",
            contactId: doc.contactId,
            issueDate: doc.issueDate,
            dueDate: doc.dueDate,
            vatMode: doc.vatMode as VatMode,
            remarks: doc.remarks,
            lines: doc.lines.map((line) => ({
              description: line.description,
              quantity: formatQuantity(line.quantity),
              unitPrice: satangToInput(line.unitPrice),
            })),
          }}
        />
      </section>
    </div>
  );
}
