import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { prisma } from "@/lib/db";
import { tr } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { isProduction, preloadBindings } from "@/lib/runtime";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await preloadBindings();
  const locale = await getLocale();
  const query = await searchParams;
  const needsSetup = (await prisma.user.count()) === 0;
  const demo = !isProduction();
  return (
    <div className="login-wrap">
      <section className="login-brand">
        <div>
          <div className="kicker" style={{ color: "#e2c27a" }}>
            BAI KHIAO
          </div>
          <h1>{tr(locale, "สมุดบัญชีของบริษัทเดียว โครงสร้างพร้อมสำหรับหลายบริษัท", "One company for now. The books are ready for more.")}</h1>
          <p>
            {tr(
              locale,
              "เข้าสู่ระบบเพื่อดูเอกสารขาย ค่าใช้จ่าย หนังสือรับรองหัก ณ ที่จ่าย และแบบ ภ.พ.30 / ภ.ง.ด.",
              "Sign in to work with sales, expenses, withholding certificates, PP.30, and PND returns.",
            )}
          </p>
        </div>
        <Link href="/" style={{ color: "#d5e7de" }}>
          {tr(locale, "กลับหน้าเว็บไซต์", "Back to the website")}
        </Link>
      </section>
      <section className="login-panel">
        <div className="login-card stack">
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>{tr(locale, "เข้าสู่ระบบ", "Sign in")}</h2>
            <div className="site-lang">
              <LanguageToggle locale={locale} variant="light" />
            </div>
          </div>
          {query.error ? <div className="alert">{tr(locale, "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "Email or password is incorrect.")}</div> : null}
          {needsSetup ? (
            <p className="notice">
              <Link href="/setup">{tr(locale, "ตั้งค่าผู้ดูแลคนแรก", "Create the first admin")}</Link>
            </p>
          ) : null}
          <form action="/api/auth/login" method="post" className="stack">
            <label className="field">
              <span>{tr(locale, "อีเมล", "Email")}</span>
              <input name="email" type="email" autoComplete="username" required defaultValue={demo ? "demo@bai-khiao.example" : ""} />
            </label>
            <label className="field">
              <span>{tr(locale, "รหัสผ่าน", "Password")}</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button className="btn btn-primary" type="submit">
              {tr(locale, "เข้าสู่ระบบ", "Sign in")}
            </button>
          </form>
          {demo ? (
            <div className="creds">
              <div>{tr(locale, "บัญชีตัวอย่างหลังสั่ง seed ในเครื่องเท่านั้น", "Local demo account after seeding")}</div>
              <strong>demo@bai-khiao.example</strong>
              <div>Demo1234!</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
