import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { getLocale } from "@/lib/locale";
import { tr } from "@/lib/i18n";

export default async function HomePage() {
  const locale = await getLocale();
  return (
    <div className="site">
      <nav className="site-nav">
        <Link href="/" className="brand" style={{ color: "inherit" }}>
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1b5e45" />
            <path d="M9 23V9h8.2a5.2 5.2 0 0 1 0 10.4H13" fill="none" stroke="#f4efe4" strokeWidth="2" />
            <path d="M17 9.5c3.2 1.6 5 4.2 5 7.2" fill="none" stroke="#e2c27a" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <strong>ใบเขียว</strong>
            <span style={{ color: "var(--muted)" }}>Bai Khiao Books</span>
          </div>
        </Link>
        <div className="actions">
          <div className="site-lang">
            <LanguageToggle locale={locale} variant="light" />
          </div>
          <Link className="btn btn-primary" href="/login">
            {tr(locale, "เข้าสู่ระบบ", "Sign in")}
          </Link>
        </div>
      </nav>
      <header className="hero">
        <div>
          <div className="kicker">FOR SMALL THAI COMPANIES</div>
          <h1>{tr(locale, "บัญชีที่รู้ว่าภาษีซื้ออยู่เดือนไหน", "Books that know which month the VAT belongs to")}</h1>
          <p className="lede">
            {tr(
              locale,
              "ใบเขียวออกใบเสนอราคา ใบแจ้งหนี้ และใบกำกับภาษี คิด VAT 7% ทั้งแบบรวมและแบบบวก หัก ณ ที่จ่ายรายบรรทัด แล้วแยก ภ.พ.30 ตามวันที่ใบกำกับ กับ ภ.ง.ด.3/53 ตามวันที่จ่าย",
              "Bai Khiao issues quotations, invoices, and tax invoices, calculates 7% VAT inclusive or exclusive, withholds tax per line, then files PP.30 by tax-invoice month and PND 3/53 by payment month.",
            )}
          </p>
          <div className="actions" style={{ marginTop: 18 }}>
            <Link className="btn btn-primary" href="/login">
              {tr(locale, "เปิดสมุดบัญชีตัวอย่าง", "Open the demo books")}
            </Link>
            <a className="btn btn-ghost" href="#months">
              {tr(locale, "ดูกฎเดือนภาษี", "See the month rules")}
            </a>
          </div>
        </div>
        <div className="card">
          <div className="kicker">{tr(locale, "ตัวอย่าง ภ.พ.30", "Sample PP.30")}</div>
          <h2 style={{ fontSize: 28, letterSpacing: "-0.03em" }}>{tr(locale, "พฤศจิกายน 2569", "November 2026")}</h2>
          <p className="muted">{tr(locale, "ตัวเลขนี้เป็นภาพประกอบ ไม่ใช่ข้อมูลบริษัทจริง", "Illustration only. Not a real company.")}</p>
          <dl className="stack">
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>{tr(locale, "ภาษีขาย", "Output VAT")}</span>
              <strong>฿8,400.00</strong>
            </div>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>{tr(locale, "ภาษีซื้อ", "Input VAT")}</span>
              <strong>฿700.00</strong>
            </div>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>{tr(locale, "ยกมาจากเดือนที่ชำระเกิน", "Excess brought forward")}</span>
              <strong>฿3,500.00</strong>
            </div>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>{tr(locale, "ภาษีที่ต้องชำระ", "VAT payable")}</span>
              <strong>฿4,200.00</strong>
            </div>
          </dl>
        </div>
      </header>
      <section className="feature-grid">
        {[
          [tr(locale, "เอกสารขาย", "Sales documents"), tr(locale, "ใบเสนอราคา ใบแจ้งหนี้ และใบกำกับภาษี/ใบเสร็จรับเงิน เลขที่รันอัตโนมัติ ส่งออก PDF ได้ทั้งไทยและอังกฤษ", "Quotations, invoices, and tax invoice/receipts with running numbers and Thai or English PDFs.")],
          [tr(locale, "ค่าใช้จ่ายและ 50 ทวิ", "Expenses and 50 bis"), tr(locale, "VAT 7% หรือ 0 หัก ณ ที่จ่าย 1/2/3/5% ต่างกันได้ในบิลเดียวกัน แนบหลักฐาน และออกหนังสือรับรองเมื่อจ่ายแล้ว", "VAT at 7% or 0, withholding at 1/2/3/5% per line, proof files, and a certificate once the bill is paid.")],
          [tr(locale, "แบบภาษี", "Tax returns"), tr(locale, "ร่าง ภ.พ.30 รายเดือนพร้อมยอดชำระเกินยกไป และ ภ.ง.ด.3/53 เฉพาะฉบับที่ยืนยัน พร้อมไฟล์ TXT ตามรูปแบบกรมสรรพากรและ Excel", "Monthly PP.30 drafts with excess carried forward, and PND 3/53 from confirmed certificates, with a Revenue Department-style TXT file and Excel.")],
        ].map(([title, body]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p className="muted">{body}</p>
          </article>
        ))}
      </section>
      <section id="months" className="rules">
        <article className="card rule">
          <div className="kicker">PP.30</div>
          <h2>{tr(locale, "ภาษีซื้อดูวันที่ใบกำกับ", "Input VAT follows the tax invoice")}</h2>
          <p>
            {tr(
              locale,
              "บิลลงวันที่ 3 พฤศจิกายน แต่ใบกำกับภาษีลงวันที่ 28 ตุลาคม จะไปอยู่ ภ.พ.30 เดือนตุลาคม เอกสารหนึ่งฉบับอยู่ในเดือนเดียว และยอดชำระเกินยกไปเดือนถัดไป",
              "A bill dated 3 November with a tax invoice dated 28 October belongs in October's PP.30. A document is counted in one month, and excess VAT carries forward.",
            )}
          </p>
        </article>
        <article className="card rule">
          <div className="kicker">PND.3 / PND.53</div>
          <h2>{tr(locale, "หัก ณ ที่จ่ายดูวันที่จ่าย", "Withholding tax follows the payment")}</h2>
          <p>
            {tr(
              locale,
              "รายจ่ายเดียวกัน ถ้าจ่ายวันที่ 5 พฤศจิกายน จะเข้า ภ.ง.ด. ของเดือนพฤศจิกายน เมื่อยืนยันหนังสือรับรองแล้วเท่านั้น นิติบุคคลไป ภ.ง.ด.53 บุคคลธรรมดาไป ภ.ง.ด.3",
              "The same expense, paid on 5 November, enters November's return only after the certificate is confirmed. Companies go to PND53 and individuals to PND3.",
            )}
          </p>
        </article>
      </section>
      <footer className="site" style={{ paddingLeft: 0 }}>
        {tr(
          locale,
          "ข้อมูลในระบบตัวอย่างเป็นบริษัทสมมติ ใบเขียว ไม่มีข้อมูลบริษัทจริง",
          "The demo company is fictional. Bai Khiao does not ship any real company data.",
        )}
      </footer>
    </div>
  );
}
