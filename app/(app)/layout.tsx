import { Sidebar } from "@/components/sidebar";
import { pageContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, company, locale } = await pageContext();
  return (
    <div className="shell">
      <Sidebar
        locale={locale}
        companyName={locale === "en" ? company.nameEn : company.nameTh}
        userName={user.name}
        email={user.email}
      />
      <main className="main">{children}</main>
    </div>
  );
}
