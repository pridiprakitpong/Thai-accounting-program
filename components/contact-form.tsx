"use client";

import { useActionState } from "react";
import { tr, type Locale } from "@/lib/i18n";
import type { ActionState } from "@/lib/actions/sales";

export type ContactInitial = {
  role: string;
  partyType: string;
  titleTh: string;
  titleEn: string;
  nameTh: string;
  nameEn: string;
  lastNameTh: string;
  lastNameEn: string;
  taxId: string;
  branchCode: string;
  addressTh: string;
  addressEn: string;
  phone: string;
  email: string;
  building: string;
  roomNo: string;
  floorNo: string;
  village: string;
  addressNo: string;
  moo: string;
  soi: string;
  street: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export function ContactForm({
  locale,
  action,
  initial,
  submitLabel,
  id,
}: {
  locale: Locale;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: ContactInitial;
  submitLabel: string;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const fields: [keyof ContactInitial, string, string][] = [
    ["building", "อาคาร", "Building"],
    ["roomNo", "ห้อง", "Room"],
    ["floorNo", "ชั้น", "Floor"],
    ["village", "หมู่บ้าน", "Village"],
    ["addressNo", "เลขที่", "Number"],
    ["moo", "หมู่", "Moo"],
    ["soi", "ซอย", "Soi"],
    ["street", "ถนน", "Street"],
    ["subdistrict", "แขวง/ตำบล", "Subdistrict"],
    ["district", "เขต/อำเภอ", "District"],
    ["province", "จังหวัด", "Province"],
    ["postalCode", "รหัสไปรษณีย์", "Postal code"],
  ];
  return (
    <form action={formAction} className="stack">
      {state.error ? <div className="alert">{state.error}</div> : null}
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="form-grid">
        <label className="field">
          <span>{tr(locale, "บทบาท", "Role")}</span>
          <select name="role" defaultValue={initial.role}>
            <option value="customer">{tr(locale, "ลูกค้า", "Customer")}</option>
            <option value="vendor">{tr(locale, "ผู้ขาย", "Vendor")}</option>
            <option value="both">{tr(locale, "ทั้งสอง", "Both")}</option>
          </select>
        </label>
        <label className="field">
          <span>{tr(locale, "ประเภทบุคคล", "Party")}</span>
          <select name="partyType" defaultValue={initial.partyType}>
            <option value="juristic">{tr(locale, "นิติบุคคล (ภ.ง.ด.53)", "Juristic person (PND53)")}</option>
            <option value="individual">{tr(locale, "บุคคลธรรมดา (ภ.ง.ด.3)", "Individual (PND3)")}</option>
          </select>
        </label>
        <label className="field">
          <span>{tr(locale, "คำนำหน้า", "Title")}</span>
          <input name="titleTh" defaultValue={initial.titleTh} placeholder={tr(locale, "บริษัท / นาย", "Company / Mr.")} />
        </label>
        <label className="field">
          <span>{tr(locale, "คำนำหน้าภาษาอังกฤษ", "English title")}</span>
          <input name="titleEn" defaultValue={initial.titleEn} />
        </label>
        <label className="field">
          <span>{tr(locale, "ชื่อ", "Name")}</span>
          <input name="nameTh" defaultValue={initial.nameTh} required />
        </label>
        <label className="field">
          <span>{tr(locale, "ชื่อภาษาอังกฤษ", "English name")}</span>
          <input name="nameEn" defaultValue={initial.nameEn} />
        </label>
        <label className="field">
          <span>{tr(locale, "นามสกุล (บุคคลธรรมดา)", "Last name (individual)")}</span>
          <input name="lastNameTh" defaultValue={initial.lastNameTh} />
        </label>
        <label className="field">
          <span>{tr(locale, "นามสกุลภาษาอังกฤษ", "English last name")}</span>
          <input name="lastNameEn" defaultValue={initial.lastNameEn} />
        </label>
        <label className="field">
          <span>{tr(locale, "เลขประจำตัวผู้เสียภาษี 13 หลัก", "13-digit tax ID")}</span>
          <input name="taxId" defaultValue={initial.taxId} required inputMode="numeric" />
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
          <input name="email" type="email" defaultValue={initial.email} />
        </label>
      </div>
      <details className="card">
        <summary>{tr(locale, "ที่อยู่แยกช่องสำหรับไฟล์ ภ.ง.ด.", "Structured address for the PND file")}</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          {fields.map(([key, th, en]) => (
            <label className="field" key={key}>
              <span>{tr(locale, th, en)}</span>
              <input name={key} defaultValue={initial[key]} />
            </label>
          ))}
        </div>
      </details>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? tr(locale, "กำลังบันทึก", "Saving") : submitLabel}
      </button>
    </form>
  );
}
