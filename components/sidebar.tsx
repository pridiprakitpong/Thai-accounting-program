"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { tr, type Locale } from "@/lib/i18n";

const links = [
  { href: "/dashboard", th: "ภาพรวม", en: "Dashboard" },
  { href: "/sales", th: "เอกสารขาย", en: "Sales" },
  { href: "/expenses", th: "ค่าใช้จ่าย", en: "Expenses" },
  { href: "/wht", th: "50 ทวิ", en: "WHT certificates" },
  { href: "/reports/pp30", th: "ภ.พ.30", en: "PP.30" },
  { href: "/reports/pnd", th: "ภ.ง.ด.3 / 53", en: "PND 3 / 53" },
  { href: "/contacts", th: "ผู้ติดต่อ", en: "Contacts" },
  { href: "/company", th: "บริษัท", en: "Company" },
];

export function Sidebar({
  locale,
  companyName,
  userName,
  email,
}: {
  locale: Locale;
  companyName: string;
  userName: string;
  email: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#1b5e45" />
          <path d="M9 23V9h8.2a5.2 5.2 0 0 1 0 10.4H13" fill="none" stroke="#f4efe4" strokeWidth="2" />
          <path d="M17 9.5c3.2 1.6 5 4.2 5 7.2" fill="none" stroke="#e2c27a" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div>
          <strong>ใบเขียว</strong>
          <span>Bai Khiao Books</span>
        </div>
      </Link>
      <nav className="nav">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} className={active ? "active" : ""}>
              {locale === "en" ? link.en : link.th}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <LanguageToggle locale={locale} />
        <div className="who">
          <strong>{companyName}</strong>
          {userName}
          <div>{email}</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn btn-quiet" type="submit">
            {tr(locale, "ออกจากระบบ", "Sign out")}
          </button>
        </form>
      </div>
    </aside>
  );
}
