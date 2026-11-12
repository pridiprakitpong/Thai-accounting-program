import type { Locale } from "./i18n";
import { documentBranch } from "./tax/pnd";

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMoney(satang: number, locale: Locale = "th"): string {
  const formatted = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(satang / 100);
  return `฿${formatted}`;
}

export function formatDate(iso: string, locale: Locale): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  if (locale === "th") return `${day} ${TH_MONTHS[month - 1]} ${year + 543}`;
  return `${day} ${EN_MONTHS[month - 1]} ${year}`;
}

export function formatMonthLabel(period: string, locale: Locale): string {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  if (!year || !month) return period;
  if (locale === "th") return `${TH_MONTHS[month - 1]} ${year + 543}`;
  return `${EN_MONTHS[month - 1]} ${year}`;
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(period: string, delta: number): string {
  const index = Number(period.slice(0, 4)) * 12 + (Number(period.slice(5, 7)) - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return periodKey(year, month);
}

export function todayBangkok(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts.slice(0, 10);
}

export function currentPeriod(now = new Date()): string {
  return todayBangkok(now).slice(0, 7);
}

export function isPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export type NameParts = {
  partyType?: string;
  titleTh: string;
  titleEn: string;
  nameTh: string;
  nameEn: string;
  lastNameTh: string;
  lastNameEn: string;
};

export function contactName(contact: NameParts, locale: Locale): string {
  if (locale === "en") {
    const english = [contact.titleEn, contact.nameEn, contact.lastNameEn].filter(Boolean).join(" ");
    if (english) return english;
  }
  return [contact.titleTh, contact.nameTh, contact.lastNameTh].filter(Boolean).join(" ");
}

export function branchLabel(code: string, locale: Locale): string {
  const doc = documentBranch(code);
  if (doc === "00000") return locale === "th" ? "สำนักงานใหญ่" : "Head office";
  return locale === "th" ? `สาขาที่ ${Number(doc)}` : `Branch ${Number(doc)}`;
}

export function statusLabel(status: string, locale: Locale): string {
  const labels: Record<string, [string, string]> = {
    issued: ["ออกแล้ว", "Issued"],
    paid: ["ชำระแล้ว", "Paid"],
    unpaid: ["ยังไม่จ่าย", "Unpaid"],
    void: ["ยกเลิก", "Void"],
    draft: ["ร่าง", "Draft"],
    confirmed: ["ยืนยันแล้ว", "Confirmed"],
  };
  const pair = labels[status];
  if (!pair) return status;
  return locale === "en" ? pair[1] : pair[0];
}

export function statusTone(status: string): "ok" | "warn" | "info" | "muted" | "danger" {
  if (status === "paid" || status === "confirmed") return "ok";
  if (status === "unpaid" || status === "draft") return "warn";
  if (status === "void") return "muted";
  if (status === "issued") return "info";
  return "muted";
}
