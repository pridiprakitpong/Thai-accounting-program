export type PndForm = "pnd3" | "pnd53";

export type CertificateRef = {
  id: string;
  status: "draft" | "confirmed";
  form: PndForm;
  /** YYYY-MM-DD payment date. PND follows this month, not the tax-invoice month. */
  paymentDate: string;
};

export type PndAddress = {
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

export type PndIncome = {
  payeeKey: string;
  nid: string;
  branchNo: string;
  title: string;
  firstName: string;
  lastName: string;
  paidDate: string;
  rate: number;
  amountSatang: number;
  taxSatang: number;
  incomeType: string;
  condition: string;
  address: PndAddress;
};

export type PndParty = {
  nid: string;
  branchNo: string;
  deptName: string;
  userId: string;
  form: PndForm;
  year: number;
  month: number;
  section3?: boolean;
};

export type BuiltPnd = {
  fileName: string;
  content: string;
  header: string[];
  details: string[][];
  totalBase: number;
  totalTax: number;
  payeeCount: number;
};

const FORBIDDEN = /[|*+\/\\!$%#&@,'"\r\n]/g;

export function sanitizeRd(value: string): string {
  return value.replace(FORBIDDEN, "").replace(/\s+/g, " ").trim();
}

export function paymentPeriod(paymentDate: string): string {
  return paymentDate.slice(0, 7);
}

export function selectCertificates<T extends CertificateRef>(
  certificates: T[],
  form: PndForm,
  period: string,
): T[] {
  return certificates.filter(
    (certificate) =>
      certificate.status === "confirmed" &&
      certificate.form === form &&
      paymentPeriod(certificate.paymentDate) === period,
  );
}

export function rdMoney(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const absolute = Math.abs(satang);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function rdRate(percent: number): string {
  return percent.toFixed(2);
}

/** DDMMYYYY in the Buddhist era. */
export function rdDate(isoDate: string): string {
  if (!isoDate) return "00000000";
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${String(Number(year) + 543).padStart(4, "0")}`;
}

export function padBranch(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.padStart(6, "0").slice(-6);
}

export function documentBranch(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (!digits) return "00000";
  return digits.padStart(5, "0").slice(-5);
}

function emptyIncomeFields(): string[] {
  return ["00000000", "0.00", "0.00", "0.00", "", ""];
}

function incomeFields(item: PndIncome | undefined): string[] {
  if (!item) return emptyIncomeFields();
  return [
    rdDate(item.paidDate),
    rdRate(item.rate),
    rdMoney(item.amountSatang),
    rdMoney(item.taxSatang),
    sanitizeRd(item.incomeType).slice(0, 100),
    sanitizeRd(item.condition).slice(0, 1),
  ];
}

function addressFields(address: PndAddress): string[] {
  return [
    address.building,
    address.roomNo,
    address.floorNo,
    address.village,
    address.addressNo,
    address.moo,
    address.soi,
    address.street,
    address.subdistrict,
    address.district,
    address.province,
    address.postalCode,
  ].map((value) => sanitizeRd(value).slice(0, 100));
}

/**
 * Revenue Department central format (รูปแบบข้อมูลกลาง) for PND53 / PND3:
 * one H row of 25 fields and D rows of 38 fields, pipe-separated, CRLF, UTF-8.
 * One payee sequence holds at most three income types; further types use the next sequence.
 */
export function buildPndFile(party: PndParty, incomes: PndIncome[]): BuiltPnd {
  const groups = new Map<string, PndIncome[]>();
  const ordered = [...incomes].sort((a, b) => a.payeeKey.localeCompare(b.payeeKey) || a.paidDate.localeCompare(b.paidDate));
  for (const income of ordered) {
    const list = groups.get(income.payeeKey) ?? [];
    list.push(income);
    groups.set(income.payeeKey, list);
  }

  const details: string[][] = [];
  let sequence = 1;
  for (const list of groups.values()) {
    const address = list[0]?.address;
    for (let index = 0; index < list.length; index += 3) {
      const chunk = [list[index], list[index + 1], list[index + 2]];
      const row = [
        "D",
        String(sequence),
        padBranch(party.branchNo),
        sanitizeRd(list[0].nid).slice(0, 13),
        "0000000000",
        sanitizeRd(list[0].title).slice(0, 100),
        sanitizeRd(list[0].firstName).slice(0, 100),
        sanitizeRd(list[0].lastName).slice(0, 80),
        ...incomeFields(chunk[0]),
        ...incomeFields(chunk[1]),
        ...incomeFields(chunk[2]),
        ...addressFields(
          address ?? {
            building: "",
            roomNo: "",
            floorNo: "",
            village: "",
            addressNo: "",
            moo: "",
            soi: "",
            street: "",
            subdistrict: "",
            district: "",
            province: "",
            postalCode: "",
          },
        ),
      ];
      details.push(row);
      sequence += 1;
    }
  }

  const totalBase = incomes.reduce((sum, income) => sum + income.amountSatang, 0);
  const totalTax = incomes.reduce((sum, income) => sum + income.taxSatang, 0);
  const yearBe = party.year + 543;
  const month = String(party.month).padStart(2, "0");
  const taxType = party.form === "pnd3" ? "PND3" : "PND53";
  const header = [
    "H",
    "0000",
    party.nid,
    padBranch(party.branchNo),
    "1",
    taxType,
    party.nid,
    padBranch(party.branchNo),
    sanitizeRd(party.deptName).slice(0, 80) || "สำนักงานใหญ่",
    party.section3 === false ? "0" : "1",
    "0",
    "0",
    "0",
    month,
    String(yearBe),
    "V",
    "00",
    String(details.length),
    rdMoney(totalBase),
    rdMoney(totalTax),
    "0.00",
    rdMoney(totalTax),
    "0.00",
    sanitizeRd(party.userId).slice(0, 20),
    "2",
  ];

  const lines = [header, ...details].map((row) => row.join("|"));
  const content = `${lines.join("\r\n")}\r\n`;
  const fileName = `${taxType}_${party.nid}_${padBranch(party.branchNo)}_${yearBe}_${month}_00_00.txt`;
  return {
    fileName,
    content,
    header,
    details,
    totalBase,
    totalTax,
    payeeCount: groups.size,
  };
}
