"use client";

import { useActionState, useMemo, useState } from "react";
import { VAT_MODES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { tr, type Locale } from "@/lib/i18n";
import { parseMoneyToSatang, parseQuantityMillis } from "@/lib/tax/money";
import { calculateSales, type VatMode } from "@/lib/tax/sales";
import type { ActionState } from "@/lib/actions/sales";

type Line = { key: string; description: string; quantity: string; unitPrice: string };
type ContactOption = { id: string; name: string };

export function SalesForm({
  locale,
  contacts,
  action,
  initial,
  submitLabel,
  lockType = false,
  id,
}: {
  locale: Locale;
  contacts: ContactOption[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: {
    type: "quotation" | "invoice" | "tax_invoice";
    contactId: string;
    issueDate: string;
    dueDate: string;
    vatMode: VatMode;
    remarks: string;
    lines: { description: string; quantity: string; unitPrice: string }[];
  };
  submitLabel: string;
  lockType?: boolean;
  id?: string;
}) {
  const [lines, setLines] = useState<Line[]>(initial.lines.map((line, index) => ({ ...line, key: `l${index}` })));
  const [vatMode, setVatMode] = useState<VatMode>(initial.vatMode);
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const preview = useMemo(() => {
    const parsed = [];
    for (const line of lines) {
      const quantityMillis = parseQuantityMillis(line.quantity);
      const unitPrice = parseMoneyToSatang(line.unitPrice);
      if (!quantityMillis || unitPrice == null) return null;
      parsed.push({ description: line.description || "-", quantityMillis, unitPrice });
    }
    return parsed.length ? calculateSales(parsed, vatMode) : null;
  }, [lines, vatMode]);

  function update(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <form action={formAction} className="stack">
      {state.error ? <div className="alert">{state.error}</div> : null}
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="lines" value={JSON.stringify(lines.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })))} />
      <div className="form-grid">
        <label className="field">
          <span>{tr(locale, "ประเภท", "Type")}</span>
          <select name="type" defaultValue={initial.type} disabled={lockType}>
            <option value="quotation">{tr(locale, "ใบเสนอราคา", "Quotation")}</option>
            <option value="invoice">{tr(locale, "ใบแจ้งหนี้", "Invoice")}</option>
            <option value="tax_invoice">{tr(locale, "ใบกำกับภาษี/ใบเสร็จรับเงิน", "Tax invoice/receipt")}</option>
          </select>
          {lockType ? <input type="hidden" name="type" value={initial.type} /> : null}
        </label>
        <label className="field">
          <span>{tr(locale, "ลูกค้า", "Customer")}</span>
          <select name="contactId" defaultValue={initial.contactId} required>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{tr(locale, "วันที่เอกสาร", "Issue date")}</span>
          <input type="date" name="issueDate" defaultValue={initial.issueDate} required />
        </label>
        <label className="field">
          <span>{tr(locale, "ครบกำหนด", "Due date")}</span>
          <input type="date" name="dueDate" defaultValue={initial.dueDate} />
        </label>
        <fieldset className="field span-2">
          <legend>{tr(locale, "ภาษีมูลค่าเพิ่ม", "VAT")}</legend>
          <div className="inline">
            {VAT_MODES.map((mode) => (
              <label key={mode.key} className="inline">
                <input
                  type="radio"
                  name="vatMode"
                  value={mode.key}
                  checked={vatMode === mode.key}
                  onChange={() => setVatMode(mode.key)}
                />
                {locale === "en" ? mode.en : mode.th}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="lines">
        {lines.map((line, index) => (
          <div className="line-row" key={line.key}>
            <label className="field">
              <span>{index === 0 ? tr(locale, "รายการ", "Description") : ""}</span>
              <input value={line.description} onChange={(event) => update(line.key, { description: event.target.value })} required />
            </label>
            <label className="field">
              <span>{index === 0 ? tr(locale, "จำนวน", "Qty") : ""}</span>
              <input value={line.quantity} onChange={(event) => update(line.key, { quantity: event.target.value })} inputMode="decimal" required />
            </label>
            <label className="field">
              <span>{index === 0 ? tr(locale, "ราคา/หน่วย", "Unit price") : ""}</span>
              <input value={line.unitPrice} onChange={(event) => update(line.key, { unitPrice: event.target.value })} inputMode="decimal" required />
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
          onClick={() => setLines((current) => [...current, { key: `n${Date.now()}`, description: "", quantity: "1", unitPrice: "" }])}
        >
          {tr(locale, "เพิ่มรายการ", "Add line")}
        </button>
      </div>
      <label className="field">
        <span>{tr(locale, "หมายเหตุ", "Remarks")}</span>
        <textarea name="remarks" defaultValue={initial.remarks} />
      </label>
      <div className="preview">
        <span>{tr(locale, "มูลค่าก่อนภาษี", "Before VAT")} {preview ? formatMoney(preview.subtotal, locale) : "—"}</span>
        <span>{tr(locale, "VAT", "VAT")} {preview ? formatMoney(preview.vatAmount, locale) : "—"}</span>
        <strong>{preview ? formatMoney(preview.total, locale) : "—"}</strong>
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? tr(locale, "กำลังบันทึก", "Saving") : submitLabel}
      </button>
    </form>
  );
}
