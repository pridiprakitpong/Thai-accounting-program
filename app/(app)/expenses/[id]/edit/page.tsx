import { notFound, redirect } from "next/navigation";
import { ExpenseForm } from "@/components/expense-form";
import { updateExpense } from "@/lib/actions/expenses";
import { prisma } from "@/lib/db";
import { contactName } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";
import { satangToInput } from "@/lib/tax/money";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { company, locale } = await pageContext();
  const { id } = await params;
  const [expense, vendors] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, companyId: company.id },
      include: { lines: { orderBy: { position: "asc" } }, certificate: true },
    }),
    prisma.contact.findMany({ where: { companyId: company.id, role: { in: ["vendor", "both"] } }, orderBy: { nameTh: "asc" } }),
  ]);
  if (!expense) notFound();
  if (expense.status !== "unpaid" || expense.pp30Period || expense.certificate) redirect(`/expenses/${expense.id}`);
  return (
    <div className="stack">
      <div className="page-head">
        <h1>
          {tr(locale, "แก้ไข", "Edit")} {expense.number}
        </h1>
      </div>
      <section className="card">
        <ExpenseForm
          locale={locale}
          id={expense.id}
          vendors={vendors.map((vendor) => ({ id: vendor.id, name: contactName(vendor, locale) }))}
          action={updateExpense}
          submitLabel={tr(locale, "บันทึก", "Save")}
          initial={{
            contactId: expense.contactId,
            category: expense.category,
            billDate: expense.billDate,
            taxInvoiceNo: expense.taxInvoiceNo,
            taxInvoiceDate: expense.taxInvoiceDate,
            vatRate: expense.vatRate === 0 ? "0" : "7",
            notes: expense.notes,
            lines: expense.lines.map((line) => ({
              description: line.description,
              amount: satangToInput(line.baseAmount),
              whtRate: String(line.whtRate),
              incomeType: line.incomeType,
              payCondition: line.payCondition,
            })),
          }}
        />
      </section>
    </div>
  );
}
