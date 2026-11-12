import Link from "next/link";
import { ExpenseForm } from "@/components/expense-form";
import { createExpense } from "@/lib/actions/expenses";
import { prisma } from "@/lib/db";
import { contactName, todayBangkok } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pageContext } from "@/lib/session";

export default async function NewExpensePage() {
  const { company, locale } = await pageContext();
  const vendors = await prisma.contact.findMany({
    where: { companyId: company.id, role: { in: ["vendor", "both"] } },
    orderBy: { nameTh: "asc" },
  });
  const today = todayBangkok();
  if (vendors.length === 0) {
    return (
      <div className="card">
        <p>{tr(locale, "เพิ่มผู้ขายก่อนบันทึกค่าใช้จ่าย", "Add a vendor before recording an expense.")}</p>
        <Link className="btn btn-primary" href="/contacts/new">
          {tr(locale, "เพิ่มผู้ติดต่อ", "Add contact")}
        </Link>
      </div>
    );
  }
  return (
    <div className="stack">
      <div className="page-head">
        <h1>{tr(locale, "ค่าใช้จ่ายใหม่", "New expense")}</h1>
      </div>
      <section className="card">
        <ExpenseForm
          locale={locale}
          allowFiles
          vendors={vendors.map((vendor) => ({ id: vendor.id, name: contactName(vendor, locale) }))}
          action={createExpense}
          submitLabel={tr(locale, "บันทึกค่าใช้จ่าย", "Save expense")}
          initial={{
            contactId: vendors[0].id,
            category: "service",
            billDate: today,
            taxInvoiceNo: "",
            taxInvoiceDate: today,
            vatRate: "7",
            notes: "",
            lines: [
              { description: "", amount: "", whtRate: "5", incomeType: "rental", payCondition: "1" },
              { description: "", amount: "", whtRate: "3", incomeType: "service", payCondition: "1" },
            ],
          }}
        />
      </section>
    </div>
  );
}
