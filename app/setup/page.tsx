import Link from "next/link";
import { redirect } from "next/navigation";
import { createFirstAdmin } from "@/lib/actions/setup";
import { prisma } from "@/lib/db";
import { tr } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { bindings, preloadBindings } from "@/lib/runtime";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await preloadBindings();
  if ((await prisma.user.count()) > 0) redirect("/login");
  const locale = await getLocale();
  const query = await searchParams;
  const secretsReady = Boolean((bindings().ADMIN_EMAIL || process.env.ADMIN_EMAIL) && (bindings().ADMIN_PASSWORD || process.env.ADMIN_PASSWORD));
  const error =
    query.error === "secrets"
      ? tr(locale, "ยังไม่ได้ตั้ง ADMIN_EMAIL และ ADMIN_PASSWORD", "Set ADMIN_EMAIL and ADMIN_PASSWORD before setup.")
      : query.error === "auth"
        ? tr(locale, "อีเมลหรือรหัสผ่านไม่ตรงกับค่าลับของผู้ดูแล", "Email or password does not match the admin secret.")
        : query.error === "form"
          ? tr(locale, "กรอกชื่อและเลขประจำตัวผู้เสียภาษี 13 หลักที่ถูกต้อง", "Enter the names and a valid 13-digit tax ID.")
          : "";
  return (
    <div className="login-wrap">
      <section className="login-brand">
        <div>
          <div className="kicker" style={{ color: "#e2c27a" }}>BAI KHIAO</div>
          <h1>{tr(locale, "ตั้งค่าครั้งเดียว แล้วหน้านี้จะปิดเอง", "One-time setup. This page locks after the first admin.")}</h1>
          <p>{tr(locale, "ใช้ได้เฉพาะเมื่อยังไม่มีผู้ใช้ และต้องตรงกับ ADMIN_EMAIL / ADMIN_PASSWORD ที่ตั้งเป็น secret", "Available only while there are no users, and only with the ADMIN_EMAIL and ADMIN_PASSWORD secrets.")}</p>
        </div>
        <Link href="/login" style={{ color: "#d5e7de" }}>{tr(locale, "กลับไปเข้าสู่ระบบ", "Back to sign in")}</Link>
      </section>
      <section className="login-panel">
        <form action={createFirstAdmin} className="login-card stack">
          <h2 style={{ margin: 0 }}>{tr(locale, "ผู้ดูแลคนแรก", "First admin")}</h2>
          {error ? <div className="alert">{error}</div> : null}
          {secretsReady ? null : <div className="notice">{tr(locale, "ใส่ secret ก่อนเปิดหน้านี้ใน production", "Add the admin secrets before using this page in production.")}</div>}
          <label className="field"><span>{tr(locale, "อีเมล", "Email")}</span><input name="email" type="email" required autoComplete="username" /></label>
          <label className="field"><span>{tr(locale, "รหัสผ่าน", "Password")}</span><input name="password" type="password" required autoComplete="new-password" /></label>
          <label className="field"><span>{tr(locale, "ชื่อผู้ใช้", "Your name")}</span><input name="name" required /></label>
          <label className="field"><span>{tr(locale, "ชื่อบริษัท", "Company name")}</span><input name="nameTh" required /></label>
          <label className="field"><span>{tr(locale, "ชื่อภาษาอังกฤษ", "English name")}</span><input name="nameEn" required /></label>
          <label className="field"><span>{tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")}</span><input name="taxId" required inputMode="numeric" /></label>
          <button className="btn btn-primary" type="submit">{tr(locale, "สร้างบริษัทและเข้าสู่ระบบ", "Create the company and sign in")}</button>
        </form>
      </section>
    </div>
  );
}
