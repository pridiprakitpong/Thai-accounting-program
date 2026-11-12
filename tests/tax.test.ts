import { describe, expect, it } from "vitest";
import { bahtText, bahtTextEn } from "@/lib/tax/baht-text";
import { calculateExpense } from "@/lib/tax/expense";
import { parseMoneyToSatang, parseQuantityMillis } from "@/lib/tax/money";
import { buildPndFile, paymentPeriod, rdDate, selectCertificates } from "@/lib/tax/pnd";
import { buildPp30Series, documentsForMonth, inputVatPeriod, outputVatPeriod } from "@/lib/tax/pp30";
import { calculateSales } from "@/lib/tax/sales";
import { isValidThaiTaxId, withThaiTaxIdCheckDigit } from "@/lib/tax/tax-id";

const b = (value: string) => {
  const satang = parseMoneyToSatang(value);
  if (satang == null) throw new Error(`bad money ${value}`);
  return satang;
};

describe("sales VAT", () => {
  it("adds 7% on an exclusive base and rounds half up", () => {
    const result = calculateSales(
      [{ description: "งาน", quantityMillis: 1000, unitPrice: b("100.00") }],
      "exclusive",
    );
    expect(result.subtotal).toBe(b("100.00"));
    expect(result.vatAmount).toBe(b("7.00"));
    expect(result.total).toBe(b("107.00"));

    const rounded = calculateSales(
      [{ description: "งาน", quantityMillis: 1000, unitPrice: b("10.08") }],
      "exclusive",
    );
    expect(rounded.vatAmount).toBe(71);
  });

  it("splits an inclusive total into base and VAT", () => {
    const exact = calculateSales(
      [{ description: "งาน", quantityMillis: 1000, unitPrice: b("107.00") }],
      "inclusive",
    );
    expect(exact.subtotal).toBe(b("100.00"));
    expect(exact.vatAmount).toBe(b("7.00"));
    expect(exact.total).toBe(b("107.00"));

    const uneven = calculateSales(
      [{ description: "งาน", quantityMillis: 1000, unitPrice: b("100.00") }],
      "inclusive",
    );
    expect(uneven.subtotal).toBe(b("93.46"));
    expect(uneven.vatAmount).toBe(b("6.54"));
    expect(uneven.total).toBe(b("100.00"));
  });

  it("charges no VAT when the document is outside the VAT system", () => {
    const result = calculateSales(
      [{ description: "งาน", quantityMillis: 1000, unitPrice: b("50.00") }],
      "none",
    );
    expect(result).toMatchObject({ subtotal: 5000, vatAmount: 0, total: 5000 });
  });

  it("computes VAT on the document total and keeps line allocations in balance", () => {
    const result = calculateSales(
      [
        { description: "ก", quantityMillis: 2500, unitPrice: b("100.00") },
        { description: "ข", quantityMillis: parseQuantityMillis("1.5")!, unitPrice: b("80.00") },
      ],
      "exclusive",
    );
    expect(result.lines[0].amount).toBe(b("250.00"));
    expect(result.lines[1].amount).toBe(b("120.00"));
    expect(result.vatAmount).toBe(b("25.90"));
    expect(result.lines.reduce((sum, line) => sum + line.vatAmount, 0)).toBe(result.vatAmount);
    expect(result.subtotal + result.vatAmount).toBe(result.total);
  });
});

describe("expense VAT and withholding tax", () => {
  it("lets each line keep its own withholding rate", () => {
    const result = calculateExpense(
      [
        { description: "ค่าเช่า", incomeType: "rental", base: b("20000.00"), whtRate: 5 },
        { description: "ค่าบริการ", incomeType: "service", base: b("10000.00"), whtRate: 3 },
      ],
      7,
    );
    expect(result.subtotal).toBe(b("30000.00"));
    expect(result.vatAmount).toBe(b("2100.00"));
    expect(result.lines[0].whtAmount).toBe(b("1000.00"));
    expect(result.lines[1].whtAmount).toBe(b("300.00"));
    expect(result.whtAmount).toBe(b("1300.00"));
    expect(result.netPayable).toBe(b("30800.00"));
    expect(result.lines.reduce((sum, line) => sum + line.vatAmount, 0)).toBe(result.vatAmount);
  });

  it("computes purchase VAT on the summed base, not the sum of rounded line VAT", () => {
    const result = calculateExpense(
      [
        { description: "ก", incomeType: "service", base: b("10.10"), whtRate: 0 },
        { description: "ข", incomeType: "service", base: b("10.10"), whtRate: 0 },
      ],
      7,
    );
    expect(result.subtotal).toBe(2020);
    expect(result.vatAmount).toBe(141);
  });

  it("withholds per line when a document-level rate would round differently", () => {
    const result = calculateExpense(
      [
        { description: "ก", incomeType: "service", base: b("10.10"), whtRate: 3 },
        { description: "ข", incomeType: "service", base: b("10.10"), whtRate: 3 },
      ],
      0,
    );
    expect(result.vatAmount).toBe(0);
    expect(result.whtAmount).toBe(60);
    expect(result.netPayable).toBe(2020 - 60);
  });

  it("rejects rates outside 0, 1, 2, 3, and 5", () => {
    expect(() =>
      calculateExpense([{ description: "ก", incomeType: "service", base: 10000, whtRate: 4 }], 7),
    ).toThrow(/rate/i);
  });
});

describe("PP30", () => {
  it("carries excess VAT into the next month and can turn it into tax payable", () => {
    const series = buildPp30Series(
      [
        { id: "out-oct", kind: "output", period: "2026-10", vat: b("3500.00"), lockedTo: null, active: true },
        { id: "in-oct", kind: "input", period: "2026-10", vat: b("7000.00"), lockedTo: null, active: true },
        { id: "out-nov", kind: "output", period: "2026-11", vat: b("8400.00"), lockedTo: null, active: true },
        { id: "in-nov", kind: "input", period: "2026-11", vat: b("700.00"), lockedTo: null, active: true },
      ],
      "2026-10",
      "2026-11",
    );
    expect(series[0]).toMatchObject({
      carryIn: 0,
      vatPayable: 0,
      excessVat: b("3500.00"),
    });
    expect(series[1]).toMatchObject({
      carryIn: b("3500.00"),
      vatPayable: b("4200.00"),
      excessVat: 0,
    });
  });

  it("carries excess across a month that has no documents", () => {
    const series = buildPp30Series(
      [
        { id: "in", kind: "input", period: "2026-10", vat: 500, lockedTo: null, active: true },
        { id: "out", kind: "output", period: "2026-12", vat: 200, lockedTo: null, active: true },
      ],
      "2026-10",
      "2026-12",
    );
    expect(series.map((month) => month.excessVat)).toEqual([500, 500, 300]);
    expect(series[2].vatPayable).toBe(0);
    expect(series[1].outputVat).toBe(0);
  });

  it("never counts one document in two months, even when a draft claimed a different month", () => {
    const docs = [
      { id: "a", kind: "output" as const, period: "2026-10", vat: 100, lockedTo: "2026-10", active: true },
      { id: "b", kind: "input" as const, period: "2026-11", vat: 50, lockedTo: "2026-10", active: true },
      { id: "c", kind: "input" as const, period: "2026-11", vat: 70, lockedTo: null, active: true },
      { id: "void", kind: "output" as const, period: "2026-11", vat: 999, lockedTo: null, active: false },
    ];
    const series = buildPp30Series(docs, "2026-10", "2026-11");
    expect(series[0].inputIds).toEqual(["b"]);
    expect(series[1].inputIds).toEqual(["c"]);
    expect(series[1].outputIds).toEqual([]);
    const seen = [...series[0].outputIds, ...series[0].inputIds, ...series[1].outputIds, ...series[1].inputIds];
    expect(new Set(seen).size).toBe(seen.length);
    expect(documentsForMonth(docs, "2026-11").map((doc) => doc.id)).toEqual(["c"]);
  });

  it("puts input VAT on the tax-invoice month and withholding tax on the payment month", () => {
    const billDate = "2026-11-03";
    const taxInvoiceDate = "2026-10-28";
    const paymentDate = "2026-11-05";
    expect(inputVatPeriod(taxInvoiceDate)).toBe("2026-10");
    expect(inputVatPeriod(taxInvoiceDate)).not.toBe(billDate.slice(0, 7));
    expect(outputVatPeriod("2026-11-12")).toBe("2026-11");
    expect(paymentPeriod(paymentDate)).toBe("2026-11");

    const series = buildPp30Series(
      [
        {
          id: "exp",
          kind: "input",
          period: inputVatPeriod(taxInvoiceDate),
          vat: b("1400.00"),
          lockedTo: null,
          active: true,
        },
      ],
      "2026-10",
      "2026-11",
    );
    expect(series[0].inputVat).toBe(b("1400.00"));
    expect(series[1].inputVat).toBe(0);

    const confirmed = {
      id: "cert",
      status: "confirmed" as const,
      form: "pnd53" as const,
      paymentDate,
    };
    expect(selectCertificates([confirmed], "pnd53", "2026-10")).toHaveLength(0);
    expect(selectCertificates([confirmed], "pnd53", "2026-11")).toHaveLength(1);
    expect(selectCertificates([{ ...confirmed, status: "draft" }], "pnd53", "2026-11")).toHaveLength(0);
    expect(selectCertificates([confirmed], "pnd3", "2026-11")).toHaveLength(0);
  });
});

describe("PND text file", () => {
  const address = {
    building: "อาคารตัวอย่าง",
    roomNo: "",
    floorNo: "4",
    village: "",
    addressNo: "99/9",
    moo: "",
    soi: "ทดสอบ",
    street: "นิยาย",
    subdistrict: "สีลม",
    district: "บางรัก",
    province: "กรุงเทพมหานคร",
    postalCode: "10500",
  };

  it("follows the Revenue Department header and detail widths", () => {
    const nid = withThaiTaxIdCheckDigit("010556900001");
    const incomes = [1, 2, 3, 4].map((index) => ({
      payeeKey: "payee-1",
      nid: withThaiTaxIdCheckDigit("010555000001"),
      branchNo: "00000",
      title: "บริษัท",
      firstName: "ออฟฟิศสวน จำกัด",
      lastName: "",
      paidDate: "2026-11-05",
      rate: index === 1 ? 5 : 3,
      amountSatang: b("1000.00"),
      taxSatang: index === 1 ? b("50.00") : b("30.00"),
      incomeType: index === 1 ? "ค่าเช่า#อาคาร" : `ค่าบริการ ${index}`,
      condition: "1",
      address,
    }));
    const built = buildPndFile(
      {
        nid,
        branchNo: "00000",
        deptName: "สำนักงานใหญ่",
        userId: "00000000000000000000",
        form: "pnd53",
        year: 2026,
        month: 11,
      },
      incomes,
    );

    expect(built.fileName).toBe(`PND53_${nid}_000000_2569_11_00_00.txt`);
    expect(built.header).toHaveLength(25);
    expect(built.details).toHaveLength(2);
    expect(built.details[0]).toHaveLength(38);
    expect(built.details[1]).toHaveLength(38);
    expect(built.details[0][1]).toBe("1");
    expect(built.details[1][1]).toBe("2");
    expect(built.details[0][8]).toBe(rdDate("2026-11-05"));
    expect(rdDate("2026-11-05")).toBe("05112569");
    expect(built.details[0][12]).toBe("ค่าเช่าอาคาร");
    expect(built.content.includes("#")).toBe(false);
    expect(built.content.endsWith("\r\n")).toBe(true);
    expect(built.content.split("\r\n").filter(Boolean)[0].split("|")).toHaveLength(25);
    expect(built.totalBase).toBe(b("4000.00"));
    expect(built.totalTax).toBe(b("140.00"));
    expect(built.header[18]).toBe("4000.00");
    expect(built.header[19]).toBe("140.00");
    expect(built.header[5]).toBe("PND53");
    expect(built.details[1][14]).toBe("00000000");
  });

  it("uses PND3 for a person and keeps an empty optional slot as adjacent pipes", () => {
    const built = buildPndFile(
      {
        nid: withThaiTaxIdCheckDigit("010556900001"),
        branchNo: "1",
        deptName: "สำนักงานใหญ่",
        userId: "DEMO",
        form: "pnd3",
        year: 2026,
        month: 11,
      },
      [
        {
          payeeKey: "person",
          nid: withThaiTaxIdCheckDigit("110370000001"),
          branchNo: "00000",
          title: "นาย",
          firstName: "สมชาย",
          lastName: "พัฒนา",
          paidDate: "2026-11-10",
          rate: 3,
          amountSatang: b("15000.00"),
          taxSatang: b("450.00"),
          incomeType: "ค่าวิชาชีพอิสระ",
          condition: "1",
          address,
        },
      ],
    );
    expect(built.fileName.startsWith("PND3_")).toBe(true);
    expect(built.header[7]).toBe("000001");
    expect(built.details[0][5]).toBe("นาย");
    expect(built.details[0][7]).toBe("พัฒนา");
    expect(built.content.includes("||")).toBe(true);
  });
});

describe("Thai tax id and baht words", () => {
  it("checks the thirteenth digit", () => {
    const id = withThaiTaxIdCheckDigit("010556900001");
    expect(isValidThaiTaxId(id)).toBe(true);
    expect(isValidThaiTaxId(`${id.slice(0, 12)}${(Number(id[12]) + 1) % 10}`)).toBe(false);
    expect(isValidThaiTaxId("123")).toBe(false);
  });

  it("reads baht amounts in Thai and English", () => {
    expect(bahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(bahtText(100)).toBe("หนึ่งบาทถ้วน");
    expect(bahtText(101)).toBe("หนึ่งบาทหนึ่งสตางค์");
    expect(bahtText(2100)).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(bahtText(10100)).toBe("หนึ่งร้อยเอ็ดบาทถ้วน");
    expect(bahtText(2_000_000)).toBe("สองหมื่นบาทถ้วน");
    expect(bahtTextEn(10100)).toBe("one hundred one baht exactly");
    expect(bahtTextEn(150)).toBe("one baht and fifty satang");
  });
});
