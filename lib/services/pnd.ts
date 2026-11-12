import { incomeType } from "../constants";
import { prisma } from "../db";
import type { Locale } from "../i18n";
import { buildPndFile, padBranch, type PndAddress, type PndForm, type PndIncome } from "../tax/pnd";
import { buildPndWorkbook } from "../reports/excel";

const emptyAddress: PndAddress = {
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
};

export async function getPndMonth(companyId: string, form: PndForm, year: number, month: number) {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const [confirmed, draftCount, company] = await Promise.all([
    prisma.whtCertificate.findMany({
      where: { companyId, formType: form, status: "confirmed", paymentDate: { startsWith: period } },
      include: { expense: { include: { lines: { orderBy: { position: "asc" } }, contact: true } } },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.whtCertificate.count({
      where: { companyId, formType: form, status: "draft", paymentDate: { startsWith: period } },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  const incomes: PndIncome[] = [];
  const rows: {
    certificateId: string;
    number: string;
    payee: string;
    taxId: string;
    paymentDate: string;
    incomeType: string;
    rate: number;
    base: number;
    tax: number;
  }[] = [];

  for (const certificate of confirmed) {
    const contact = certificate.expense.contact;
    const payeeKey = `${contact.taxId}-${padBranch(contact.branchCode)}`;
    const address: PndAddress = {
      building: contact.building,
      roomNo: contact.roomNo,
      floorNo: contact.floorNo,
      village: contact.village,
      addressNo: contact.addressNo,
      moo: contact.moo,
      soi: contact.soi,
      street: contact.street,
      subdistrict: contact.subdistrict,
      district: contact.district,
      province: contact.province,
      postalCode: contact.postalCode,
    };
    for (const line of certificate.expense.lines) {
      if (line.whtAmount <= 0 && line.whtRate <= 0) continue;
      const kind = incomeType(line.incomeType);
      incomes.push({
        payeeKey,
        nid: contact.taxId,
        branchNo: contact.branchCode,
        title: contact.titleTh || (contact.partyType === "juristic" ? "บริษัท" : ""),
        firstName: contact.nameTh,
        lastName: contact.lastNameTh,
        paidDate: certificate.paymentDate,
        rate: line.whtRate,
        amountSatang: line.baseAmount,
        taxSatang: line.whtAmount,
        incomeType: kind.pnd,
        condition: line.payCondition || "1",
        address: { ...emptyAddress, ...address },
      });
      rows.push({
        certificateId: certificate.id,
        number: certificate.number,
        payee: [contact.titleTh, contact.nameTh, contact.lastNameTh].filter(Boolean).join(" "),
        taxId: contact.taxId,
        paymentDate: certificate.paymentDate,
        incomeType: kind.pnd,
        rate: line.whtRate,
        base: line.baseAmount,
        tax: line.whtAmount,
      });
    }
  }

  const file = buildPndFile(
    {
      nid: company.taxId,
      branchNo: company.branchCode,
      deptName: "สำนักงานใหญ่",
      userId: company.rdUserId || "00000000000000000000",
      form,
      year,
      month,
    },
    incomes,
  );

  return { company, confirmed, draftCount, rows, file, period };
}

export async function pndExcel(companyId: string, form: PndForm, year: number, month: number, locale: Locale) {
  const report = await getPndMonth(companyId, form, year, month);
  const buffer = await buildPndWorkbook({
    locale,
    form,
    period: report.period,
    companyName: locale === "en" ? report.company.nameEn : report.company.nameTh,
    taxId: report.company.taxId,
    rows: report.rows,
    totalBase: report.file.totalBase,
    totalTax: report.file.totalTax,
  });
  return { filename: report.file.fileName.replace(/\.txt$/, ".xlsx"), buffer };
}
