import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { deleteContact, updateContact } from "@/lib/actions/contacts";
import { prisma } from "@/lib/db";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { company, locale } = await pageContext();
  const { id } = await params;
  const query = await searchParams;
  const contact = await prisma.contact.findFirst({ where: { id, companyId: company.id } });
  if (!contact) notFound();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{tr(locale, "แก้ไขผู้ติดต่อ", "Edit contact")}</h1>
        </div>
        <form action={deleteContact}>
          <input type="hidden" name="id" value={contact.id} />
          <button className="btn btn-danger" type="submit">
            {tr(locale, "ลบ", "Delete")}
          </button>
        </form>
      </div>
      {query.error === "used" ? (
        <div className="alert">{tr(locale, "ผู้ติดต่อนี้มีเอกสารอยู่ ลบไม่ได้", "This contact has documents and cannot be deleted.")}</div>
      ) : null}
      <section className="card">
        <ContactForm locale={locale} action={updateContact} initial={contact} id={contact.id} submitLabel={tr(locale, "บันทึก", "Save")} />
      </section>
    </div>
  );
}
