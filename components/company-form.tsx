"use client";

import { useActionState } from "react";
import { tr, type Locale } from "@/lib/i18n";
import type { ActionState } from "@/lib/actions/sales";

export function CompanyForm({
  locale,
  action,
  initial,
}: {
  locale: Locale;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: {
    nameTh: string;
    nameEn: string;
    taxId: string;
    branchCode: string;
    addressTh: string;
    addressEn: string;
    phone: string;
    email: string;
    rdUserId: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="stack">
      {state.error ? <div className="alert">{state.error}</div> : null}
      <div className="form-grid">
        <label className="field">
          <span>{tr(locale, "ชื่อบริษัท", "Company name")}</span>
          <input name="nameTh" defaultValue={initial.nameTh} required />
        </label>
        <label className="field">
          <span>{tr(locale, "ชื่อภาษาอังกฤษ", "English name")}</span>
          <input name="nameEn" defaultValue={initial.nameEn} required />
        </label>
        <label className="field">
          <span>{tr(locale, "เลขประจำตัวผู้เสียภาษี", "Tax ID")}</span>
          <input name="taxId" defaultValue={initial.taxId} required />
        </label>
        <label className="field">
          <span>{tr(locale, "สาขา (00000 = สำนักงานใหญ่)", "Branch (00000 = head office)")}</span>
          <input name="branchCode" defaultValue={initial.branchCode} required />
        </label>
        <label className="field span-2">
          <span>{tr(locale, "ที่อยู่", "Address")}</span>
          <textarea name="addressTh" defaultValue={initial.addressTh} required />
        </label>
        <label className="field span-2">
          <span>{tr(locale, "ที่อยู่ภาษาอังกฤษ", "English address")}</span>
          <textarea name="addressEn" defaultValue={initial.addressEn} />
        </label>
        <label className="field">
          <span>{tr(locale, "โทรศัพท์", "Phone")}</span>
          <input name="phone" defaultValue={initial.phone} />
        </label>
        <label className="field">
          <span>{tr(locale, "อีเมล", "Email")}</span>
          <input name="email" defaultValue={initial.email} />
        </label>
        <label className="field span-2">
          <span>{tr(locale, "รหัสผู้ใช้ e-Filing สำหรับไฟล์ ภ.ง.ด. (ไม่ใช่รหัสผ่าน)", "e-Filing user id for the PND file (not a password)")}</span>
          <input name="rdUserId" defaultValue={initial.rdUserId} maxLength={20} />
        </label>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? tr(locale, "กำลังบันทึก", "Saving") : tr(locale, "บันทึกบริษัท", "Save company")}
      </button>
    </form>
  );
}
