import fs from "fs";
import path from "path";
import { createLocalPrisma } from "../lib/local-db";
import { hashPassword } from "../lib/password";

const prisma = createLocalPrisma();
import { savePp30Draft } from "../lib/services/pp30";
import { calculateExpense } from "../lib/tax/expense";
import { parseMoneyToSatang } from "../lib/tax/money";
import { calculateSales, type VatMode } from "../lib/tax/sales";

function loadEnvFile() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const baht = (value: string) => {
  const satang = parseMoneyToSatang(value);
  if (satang == null) throw new Error(`Bad amount ${value}`);
  return satang;
};

const companyTaxId = "0105569000011";

async function main() {
  loadEnvFile();
  if (process.env.APP_ENV === "production") {
    throw new Error("Refusing to seed while APP_ENV=production. Seed is for local development only.");
  }
  const email = (process.env.DEMO_USER_EMAIL || "demo@bai-khiao.example").toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD || "Demo1234!";
  const name = process.env.DEMO_USER_NAME || "นักบัญชีตัวอย่าง";

  const existing = await prisma.company.findUnique({ where: { taxId: companyTaxId } });
  if (existing) {
    await prisma.pp30Return.deleteMany({ where: { companyId: existing.id } });
    await prisma.whtCertificate.deleteMany({ where: { companyId: existing.id } });
    await prisma.expense.deleteMany({ where: { companyId: existing.id } });
    await prisma.salesDocument.deleteMany({ where: { companyId: existing.id } });
    await prisma.contact.deleteMany({ where: { companyId: existing.id } });
    await prisma.bankAccount.deleteMany({ where: { companyId: existing.id } });
    await prisma.documentSequence.deleteMany({ where: { companyId: existing.id } });
    await prisma.user.deleteMany({ where: { companyId: existing.id } });
    await prisma.company.delete({ where: { id: existing.id } });
  }
  await prisma.user.deleteMany({ where: { email } });

  const company = await prisma.company.create({
    data: {
      nameTh: "บริษัท สยามใบเขียว จำกัด",
      nameEn: "Siam Bai Khiao Co., Ltd.",
      taxId: companyTaxId,
      branchCode: "00000",
      addressTh: "99/9 อาคารตัวอย่าง ชั้น 4 ซอยนิยาย ถนนเรื่องแต่ง แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500",
      addressEn: "99/9 Sample Tower, 4th floor, Niyai Alley, Rueang Taeng Road, Silom, Bang Rak, Bangkok 10500",
      phone: "02-000-1122",
      email: "accounts@bai-khiao.example",
      rdUserId: "00000000000000000000",
    },
  });
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      companyId: company.id,
    },
  });
  const bank = await prisma.bankAccount.create({
    data: {
      companyId: company.id,
      bankName: "ธนาคารตัวอย่าง",
      accountName: "บริษัท สยามใบเขียว จำกัด",
      accountNumber: "000-0-00000-0",
      isDefault: true,
    },
  });

  const address = {
    building: "อาคารตัวอย่าง",
    floorNo: "4",
    addressNo: "99/9",
    soi: "นิยาย",
    street: "เรื่องแต่ง",
    subdistrict: "สีลม",
    district: "บางรัก",
    province: "กรุงเทพมหานคร",
    postalCode: "10500",
    addressTh: "99/9 อาคารตัวอย่าง ซอยนิยาย ถนนเรื่องแต่ง แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500",
    addressEn: "99/9 Sample Tower, Niyai Alley, Rueang Taeng Road, Silom, Bang Rak, Bangkok 10500",
  };
  const river = await prisma.contact.create({
    data: {
      companyId: company.id,
      role: "customer",
      partyType: "juristic",
      titleTh: "บริษัท",
      titleEn: "",
      nameTh: "แม่น้ำม็อกอัป จำกัด",
      nameEn: "Maenam Mockup Co., Ltd.",
      taxId: "0105551000019",
      branchCode: "00000",
      ...address,
      addressNo: "12",
    },
  });
  const manee = await prisma.contact.create({
    data: {
      companyId: company.id,
      role: "customer",
      partyType: "individual",
      titleTh: "นางสาว",
      titleEn: "Ms.",
      nameTh: "มานี",
      nameEn: "Manee",
      lastNameTh: "ใจงาม",
      lastNameEn: "Jaingam",
      taxId: "1103700000011",
      branchCode: "00000",
      addressTh: "18 ซอยตัวอย่าง แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500",
      addressEn: "18 Sample Alley, Silom, Bang Rak, Bangkok 10500",
      addressNo: "18",
      soi: "ตัวอย่าง",
      subdistrict: "สีลม",
      district: "บางรัก",
      province: "กรุงเทพมหานคร",
      postalCode: "10500",
    },
  });
  const office = await prisma.contact.create({
    data: {
      companyId: company.id,
      role: "vendor",
      partyType: "juristic",
      titleTh: "บริษัท",
      titleEn: "",
      nameTh: "ออฟฟิศสวน จำกัด",
      nameEn: "Office Suan Co., Ltd.",
      taxId: "0105552000012",
      branchCode: "00000",
      ...address,
      addressNo: "21",
    },
  });
  const electric = await prisma.contact.create({
    data: {
      companyId: company.id,
      role: "vendor",
      partyType: "juristic",
      titleTh: "บริษัท",
      titleEn: "",
      nameTh: "ไฟฟ้านิยาย จำกัด",
      nameEn: "Fictional Electric Co., Ltd.",
      taxId: "0105553000016",
      branchCode: "00000",
      addressTh: "1 ถนนเรื่องแต่ง เขตบางรัก กรุงเทพมหานคร 10500",
      addressEn: "1 Rueang Taeng Road, Bang Rak, Bangkok 10500",
      addressNo: "1",
      street: "เรื่องแต่ง",
      district: "บางรัก",
      province: "กรุงเทพมหานคร",
      postalCode: "10500",
    },
  });
  const somchai = await prisma.contact.create({
    data: {
      companyId: company.id,
      role: "vendor",
      partyType: "individual",
      titleTh: "นาย",
      titleEn: "Mr.",
      nameTh: "สมชาย",
      nameEn: "Somchai",
      lastNameTh: "พัฒนา",
      lastNameEn: "Phattana",
      taxId: "1103700000020",
      branchCode: "00000",
      addressTh: "44 ซอยนิยาย แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500",
      addressEn: "44 Niyai Alley, Silom, Bang Rak, Bangkok 10500",
      addressNo: "44",
      soi: "นิยาย",
      subdistrict: "สีลม",
      district: "บางรัก",
      province: "กรุงเทพมหานคร",
      postalCode: "10500",
    },
  });

  async function addSales(input: {
    contactId: string;
    type: string;
    number: string;
    status: string;
    issueDate: string;
    vatMode: VatMode;
    paymentDate?: string;
    remarks?: string;
    lines: { description: string; quantityMillis: number; unitPrice: number }[];
  }) {
    const calculated = calculateSales(input.lines, input.vatMode);
    await prisma.salesDocument.create({
      data: {
        companyId: company.id,
        contactId: input.contactId,
        type: input.type,
        number: input.number,
        status: input.status,
        issueDate: input.issueDate,
        vatMode: input.vatMode,
        remarks: input.remarks ?? "",
        paymentDate: input.paymentDate ?? "",
        subtotal: calculated.subtotal,
        vatAmount: calculated.vatAmount,
        total: calculated.total,
        lines: {
          create: calculated.lines.map((line, index) => ({
            position: index,
            description: line.description,
            quantity: line.quantityMillis,
            unitPrice: line.unitPrice,
            amount: line.amount,
          })),
        },
      },
    });
  }

  await addSales({
    contactId: river.id,
    type: "quotation",
    number: "QT2026-0001",
    status: "issued",
    issueDate: "2026-11-02",
    vatMode: "exclusive",
    remarks: "ใบเสนอราคาออกแบบเว็บไซต์ ยังไม่ใช่ใบกำกับภาษี",
    lines: [{ description: "ออกแบบเว็บไซต์ร้านค้า", quantityMillis: 1000, unitPrice: baht("12000.00") }],
  });
  await addSales({
    contactId: manee.id,
    type: "invoice",
    number: "IV2026-0001",
    status: "issued",
    issueDate: "2026-11-08",
    vatMode: "exclusive",
    remarks: "ใบแจ้งหนี้ที่ยังไม่รับเงิน",
    lines: [{ description: "ค่าที่ปรึกษาเบื้องต้น", quantityMillis: 1000, unitPrice: baht("8000.00") }],
  });
  await addSales({
    contactId: manee.id,
    type: "invoice",
    number: "IV2026-0002",
    status: "issued",
    issueDate: "2026-11-11",
    vatMode: "none",
    remarks: "รายการนอกขอบเขตภาษีมูลค่าเพิ่ม",
    lines: [{ description: "ค่าเอกสารประกอบนอกระบบ VAT", quantityMillis: 1000, unitPrice: baht("4500.00") }],
  });
  await addSales({
    contactId: river.id,
    type: "tax_invoice",
    number: "TI2026-0001",
    status: "paid",
    issueDate: "2026-10-15",
    paymentDate: "2026-10-20",
    vatMode: "exclusive",
    lines: [{ description: "ค่าระบบบัญชีรอบตุลาคม", quantityMillis: 1000, unitPrice: baht("50000.00") }],
  });
  await addSales({
    contactId: river.id,
    type: "tax_invoice",
    number: "TI2026-0002",
    status: "paid",
    issueDate: "2026-11-06",
    paymentDate: "2026-11-12",
    vatMode: "exclusive",
    lines: [{ description: "ค่าระบบบัญชีรอบพฤศจิกายน", quantityMillis: 1000, unitPrice: baht("100000.00") }],
  });
  await addSales({
    contactId: manee.id,
    type: "tax_invoice",
    number: "TI2026-0003",
    status: "issued",
    issueDate: "2026-11-20",
    vatMode: "inclusive",
    remarks: "ราคาที่กรอกเป็นยอดรวมภาษีแล้ว",
    lines: [{ description: "แพ็กเกจอบรมการใช้งาน", quantityMillis: 1000, unitPrice: baht("21400.00") }],
  });

  async function addExpense(input: {
    contactId: string;
    number: string;
    status: "unpaid" | "paid";
    category: string;
    billDate: string;
    taxInvoiceNo: string;
    taxInvoiceDate: string;
    vatRate: number;
    paymentDate?: string;
    notes?: string;
    lines: { description: string; incomeType: string; base: number; whtRate: number }[];
    certificate?: "draft" | "confirmed";
    certificateNumber?: string;
  }) {
    const calculated = calculateExpense(input.lines, input.vatRate);
    const expense = await prisma.expense.create({
      data: {
        companyId: company.id,
        contactId: input.contactId,
        bankAccountId: input.status === "paid" ? bank.id : null,
        number: input.number,
        status: input.status,
        category: input.category,
        billDate: input.billDate,
        taxInvoiceNo: input.taxInvoiceNo,
        taxInvoiceDate: input.taxInvoiceDate,
        vatRate: input.vatRate,
        notes: input.notes ?? "",
        paymentDate: input.paymentDate ?? "",
        subtotal: calculated.subtotal,
        vatAmount: calculated.vatAmount,
        whtAmount: calculated.whtAmount,
        total: calculated.total,
        netPayable: calculated.netPayable,
        lines: {
          create: calculated.lines.map((line, index) => ({
            position: index,
            description: line.description,
            incomeType: line.incomeType,
            whtRate: line.whtRate,
            payCondition: "1",
            baseAmount: line.baseAmount,
            vatAmount: line.vatAmount,
            whtAmount: line.whtAmount,
          })),
        },
      },
    });
    if (input.certificate && input.certificateNumber) {
      await prisma.whtCertificate.create({
        data: {
          companyId: company.id,
          expenseId: expense.id,
          number: input.certificateNumber,
          formType: input.contactId === somchai.id ? "pnd3" : "pnd53",
          status: input.certificate,
          paymentDate: input.paymentDate ?? input.billDate,
          baseAmount: calculated.subtotal,
          taxAmount: calculated.whtAmount,
          confirmedAt: input.certificate === "confirmed" ? new Date("2026-11-12T02:00:00.000Z") : null,
        },
      });
    }
    return expense;
  }

  const october = await addExpense({
    contactId: office.id,
    number: "EX2026-0001",
    status: "paid",
    category: "rent",
    billDate: "2026-10-20",
    taxInvoiceNo: "OFF-6810-01",
    taxInvoiceDate: "2026-10-20",
    vatRate: 7,
    paymentDate: "2026-10-25",
    notes: "ค่าเช่า 5% และค่าบริการ 3% ในบิลเดียวกัน",
    certificate: "confirmed",
    certificateNumber: "WT2026-0001",
    lines: [
      { description: "ค่าเช่าสำนักงานเดือนตุลาคม", incomeType: "rental", base: baht("50000.00"), whtRate: 5 },
      { description: "ค่าบริการส่วนกลาง", incomeType: "service", base: baht("30000.00"), whtRate: 3 },
    ],
  });
  await addExpense({
    contactId: office.id,
    number: "EX2026-0002",
    status: "paid",
    category: "service",
    billDate: "2026-11-03",
    taxInvoiceNo: "OFF-6810-02",
    taxInvoiceDate: "2026-10-28",
    vatRate: 7,
    paymentDate: "2026-11-05",
    notes: "ใบกำกับลงเดือนตุลาคม แต่จ่ายเดือนพฤศจิกายน ภาษีซื้อจึงอยู่ตุลาคม ส่วนหัก ณ ที่จ่ายอยู่พฤศจิกายน",
    certificate: "confirmed",
    certificateNumber: "WT2026-0002",
    lines: [{ description: "ค่าบริการดูแลระบบเพิ่มเติม", incomeType: "service", base: baht("20000.00"), whtRate: 3 }],
  });
  await addExpense({
    contactId: electric.id,
    number: "EX2026-0003",
    status: "unpaid",
    category: "utility",
    billDate: "2026-11-18",
    taxInvoiceNo: "ELEC-110",
    taxInvoiceDate: "2026-11-18",
    vatRate: 7,
    notes: "ยังไม่จ่าย จึงยังไม่มีหนังสือรับรอง",
    lines: [{ description: "ค่าไฟฟ้าสำนักงาน", incomeType: "other", base: baht("10000.00"), whtRate: 0 }],
  });
  await addExpense({
    contactId: somchai.id,
    number: "EX2026-0004",
    status: "paid",
    category: "professional",
    billDate: "2026-11-10",
    taxInvoiceNo: "SC-011",
    taxInvoiceDate: "2026-11-10",
    vatRate: 0,
    paymentDate: "2026-11-10",
    notes: "ผู้รับเป็นบุคคลธรรมดา จึงเข้า ภ.ง.ด.3 และไม่มีภาษีซื้อ",
    certificate: "confirmed",
    certificateNumber: "WT2026-0003",
    lines: [{ description: "ค่าออกแบบสิ่งพิมพ์", incomeType: "professional", base: baht("15000.00"), whtRate: 3 }],
  });
  await addExpense({
    contactId: office.id,
    number: "EX2026-0005",
    status: "paid",
    category: "service",
    billDate: "2026-12-02",
    taxInvoiceNo: "OFF-6812-01",
    taxInvoiceDate: "2026-12-02",
    vatRate: 7,
    paymentDate: "2026-12-02",
    notes: "หนังสือรับรองยังเป็นฉบับร่าง จึงยังไม่เข้า ภ.ง.ด.53",
    certificate: "draft",
    certificateNumber: "WT2026-0004",
    lines: [{ description: "ค่าบริการเดือนธันวาคม", incomeType: "service", base: baht("9000.00"), whtRate: 3 }],
  });

  const uploadDir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  const storedName = "demo-proof.txt";
  fs.writeFileSync(
    path.join(uploadDir, storedName),
    "หลักฐานตัวอย่างของบริษัทสมมติ ใบเขียว\nSample proof for fictional Siam Bai Khiao Co., Ltd.\nTax invoice OFF-6810-01\nThis is not a real receipt.\n",
    "utf8",
  );
  await prisma.expenseFile.create({
    data: {
      expenseId: october.id,
      filename: "sample-tax-invoice.txt",
      storedName,
      mimeType: "text/plain",
      size: 160,
    },
  });

  await prisma.documentSequence.createMany({
    data: [
      { companyId: company.id, docType: "quotation", year: 2026, lastNumber: 1 },
      { companyId: company.id, docType: "invoice", year: 2026, lastNumber: 2 },
      { companyId: company.id, docType: "tax_invoice", year: 2026, lastNumber: 3 },
      { companyId: company.id, docType: "expense", year: 2026, lastNumber: 5 },
      { companyId: company.id, docType: "wht", year: 2026, lastNumber: 4 },
    ],
  });

  await savePp30Draft(company.id, 2026, 10, prisma);
  await savePp30Draft(company.id, 2026, 11, prisma);
  console.log(`Seeded ${company.nameEn} for ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
