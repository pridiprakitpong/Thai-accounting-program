"use client";

import { useActionState, useMemo, useState } from "react";
import { CATEGORIES, INCOME_TYPES, PAY_CONDITIONS, WHT_RATE_OPTIONS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { tr, type Locale } from "@/lib/i18n";
import { calculateExpense } from "@/lib/tax/expense";
import { parseMoneyToSatang } from "@/lib/tax/money";
import type { ActionState } from "@/lib/actions/sales";

type Line = {
  key: string;
  description: string;
  amount: string;
  whtRate: string;
  incomeType: string;
  payCondition: string;
};
type ContactOption = { id: string; name: string };

export function ExpenseForm({
  locale,
  vendors,
  action,
  initial,
  submitLabel,
  id,
  allowFiles = false,
}: {
  locale: Locale;
  vendors: ContactOption[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: {
    contactId: string;
    category: string;
    billDate: string;
    taxInvoiceNo: string;
    taxInvoiceDate: string;
    vatRate: "0" | "7";
    notes: string;
    lines: Omit<Line, "key">[];
  };
  submitLabel: string;
  id?: string;
  allowFiles?: boolean;
}) {
  const [lines, setLines] = useState<Line[]>(initial.lines.map((line, index) => ({ ...line, key: `l${index}` })));
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const preview = useMemo(() => {
    const parsed = [];
    for (const line of lines) {
      const base = parseMoneyToSatang(line.amount);
      const whtRate = Number(line.whtRate);
      if (base == null || base <= 0) return null;
      parsed.push({
        description: line.description || "-",
        incomeType: line.incomeType,
        base,
        whtRate,
        payCondition: line.payCondition,
      });
    }
    if (!parsed.length) return null;
    try {
      return calculateExpense(parsed, Number(vatRate));
    } catch {
      return null;
    }
  }, [lines, vatRate]);

  function update(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  const payload = JSON.stringify(
    lines.map((line) => ({
      description: line.description,
      amount: line.amount,
      whtRate: Number(line.whtRate),
      incomeType: line.incomeType,
      payCondition: line.payCondition,
    })),
  );

  return (
    <form action={formAction} className="stack" encType="multipart/form-data">
      {state.error ? <div className="alert">{state.error}</div> : null}
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="lines" value={payload} />
      <div className="form-grid">
        <label className="field">
          <span>{tr(locale, "ผู้ขาย", "Vendor")}</span>
          <select name="contactId" defaultValue={initial.contactId} required>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{tr(locale, "หมวด", "Category")}</span>
          <select name="category" defaultValue={initial.category}>
            {CATEGORIES.map((category) => (
              <option key={category.key} value={category.key}>
                {locale === "en" ? category.en : category.th}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{tr(locale, "วันที่บิล", "Bill date")}</span>
          <input type="date" name="billDate" defaultValue={initial.billDate} required />
        </label>
        <label className="field">
          <span>{tr(locale, "เลขที่ใบกำกับภาษี", "Tax invoice no.")}</span>
          <input name="taxInvoiceNo" defaultValue={initial.taxInvoiceNo} required />
        </label>
        <label className="field">
          <span>{tr(locale, "วันที่ใบกำกับภาษี", "Tax invoice date")}</span>
          <input type="date" name="taxInvoiceDate" defaultValue={initial.taxInvoiceDate} required />
        </label>
        <label className="field">
          <span>VAT</span>
          <select name="vatRate" value={vatRate} onChange={(event) => setVatRate(event.target.value as "0" | "7")}>
            <option value="7">{tr(locale, "7% จากฐานก่อนภาษี", "7% on the base")}</option>
            <option value="0">{tr(locale, "0%", "0%")}</option>
          </select>
        </label>
      </div>
      <p className="muted">
        {tr(
          locale,
          "ใส่จำนวนเงินก่อน VAT หัก ณ ที่จ่ายคิดจากฐานนี้ และอัตราไม่ต้องเท่ากันทุกรายการ เช่น ค่าเช่า 5% กับค่าบริการ 3% ภาษีซื้อจะเข้าเดือนของวันที่ใบกำกับ ไม่ใช่วันที่บิล",
          "Enter amounts before VAT. Withholding tax uses that base and can differ by line, for example rent at 5% and service at 3%. Input VAT follows the tax invoice date, not the bill date.",
        )}
      </p>
      <div className="lines">
        {lines.map((line, index) => (
          <div className="line-row expense" key={line.key}>
            <label className="field">
              <span>{index === 0 ? tr(locale, "รายการ", "Description") : ""}</span>
              <input value={line.description} onChange={(event) => update(line.key, { description: event.target.value })} required />
            </label>
            <label className="field">
              <span>{index === 0 ? tr(locale, "ประเภทเงินได้", "Income type") : ""}</span>
              <select
                value={line.incomeType}
                onChange={(event) => {
                  const next = INCOME_TYPES.find((item) => item.key === event.target.value);
                  update(line.key, { incomeType: event.target.value, whtRate: String(next?.defaultRate ?? line.whtRate) });
                }}
              >
                {INCOME_TYPES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {locale === "en" ? item.en : item.th}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{index === 0 ? tr(locale, "ฐานก่อน VAT", "Base") : ""}</span>
              <input value={line.amount} onChange={(event) => update(line.key, { amount: event.target.value })} inputMode="decimal" required />
            </label>
            <label className="field">
              <span>{index === 0 ? tr(locale, "หัก ณ ที่จ่าย", "WHT") : ""}</span>
              <select value={line.whtRate} onChange={(event) => update(line.key, { whtRate: event.target.value })}>
                {WHT_RATE_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{index === 0 ? tr(locale, "เงื่อนไข", "Condition") : ""}</span>
              <select value={line.payCondition} onChange={(event) => update(line.key, { payCondition: event.target.value })}>
                {PAY_CONDITIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {locale === "en" ? item.en : item.th}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setLines((current) => (current.length === 1 ? current : current.filter((item) => item.key !== line.key)))}
            >
              {tr(locale, "ลบ", "Remove")}
            </button>
          </div>
        ))}
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() =>
            setLines((current) => [
              ...current,
              { key: `n${Date.now()}`, description: "", amount: "", whtRate: "3", incomeType: "service", payCondition: "1" },
            ])
          }
        >
          {tr(locale, "เพิ่มรายการ", "Add line")}
        </button>
      </div>
      {allowFiles ? (
        <label className="field">
          <span>{tr(locale, "หลักฐาน (PDF หรือรูป ไม่เกิน 8 MB)", "Proof files (PDF or image, up to 8 MB)")}</span>
          <input type="file" name="files" multiple accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" />
        </label>
      ) : null}
      <label className="field">
        <span>{tr(locale, "หมายเหตุ", "Notes")}</span>
        <textarea name="notes" defaultValue={initial.notes} />
      </label>
      <div className="preview">
        <span>{tr(locale, "ฐาน", "Base")} {preview ? formatMoney(preview.subtotal, locale) : "—"}</span>
        <span>VAT {preview ? formatMoney(preview.vatAmount, locale) : "—"}</span>
        <span>{tr(locale, "หัก ณ ที่จ่าย", "WHT")} {preview ? formatMoney(preview.whtAmount, locale) : "—"}</span>
        <strong>{preview ? formatMoney(preview.netPayable, locale) : "—"}</strong>
        <span className="muted">{tr(locale, "ยอดจ่ายสุทธิ = ฐาน + VAT − หัก ณ ที่จ่าย", "Net payable = base + VAT − withholding tax")}</span>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? tr(locale, "กำลังบันทึก", "Saving") : submitLabel}
      </button>
    </form>
  );
}
