-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL DEFAULT '00000',
    "addressTh" TEXT NOT NULL,
    "addressEn" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "rdUserId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "titleTh" TEXT NOT NULL DEFAULT '',
    "titleEn" TEXT NOT NULL DEFAULT '',
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "lastNameTh" TEXT NOT NULL DEFAULT '',
    "lastNameEn" TEXT NOT NULL DEFAULT '',
    "taxId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL DEFAULT '00000',
    "addressTh" TEXT NOT NULL DEFAULT '',
    "addressEn" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "building" TEXT NOT NULL DEFAULT '',
    "roomNo" TEXT NOT NULL DEFAULT '',
    "floorNo" TEXT NOT NULL DEFAULT '',
    "village" TEXT NOT NULL DEFAULT '',
    "addressNo" TEXT NOT NULL DEFAULT '',
    "moo" TEXT NOT NULL DEFAULT '',
    "soi" TEXT NOT NULL DEFAULT '',
    "street" TEXT NOT NULL DEFAULT '',
    "subdistrict" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "province" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL DEFAULT '',
    "vatMode" TEXT NOT NULL,
    "remarks" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL,
    "vatAmount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "paymentDate" TEXT NOT NULL DEFAULT '',
    "pp30Period" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "SalesLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SalesDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "billDate" TEXT NOT NULL,
    "taxInvoiceNo" TEXT NOT NULL,
    "taxInvoiceDate" TEXT NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "subtotal" INTEGER NOT NULL,
    "vatAmount" INTEGER NOT NULL,
    "whtAmount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "netPayable" INTEGER NOT NULL,
    "paymentDate" TEXT NOT NULL DEFAULT '',
    "pp30Period" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "incomeType" TEXT NOT NULL,
    "whtRate" INTEGER NOT NULL,
    "payCondition" TEXT NOT NULL DEFAULT '1',
    "baseAmount" INTEGER NOT NULL,
    "vatAmount" INTEGER NOT NULL,
    "whtAmount" INTEGER NOT NULL,
    CONSTRAINT "ExpenseLine_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseFile_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhtCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "baseAmount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WhtCertificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WhtCertificate_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pp30Return" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "outputVat" INTEGER NOT NULL,
    "inputVat" INTEGER NOT NULL,
    "carryIn" INTEGER NOT NULL,
    "vatPayable" INTEGER NOT NULL,
    "excessVat" INTEGER NOT NULL,
    "outputCount" INTEGER NOT NULL,
    "inputCount" INTEGER NOT NULL,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pp30Return_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_taxId_key" ON "Company"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Contact_companyId_role_idx" ON "Contact"("companyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSequence_companyId_docType_year_key" ON "DocumentSequence"("companyId", "docType", "year");

-- CreateIndex
CREATE INDEX "SalesDocument_companyId_issueDate_idx" ON "SalesDocument"("companyId", "issueDate");

-- CreateIndex
CREATE INDEX "SalesDocument_companyId_pp30Period_idx" ON "SalesDocument"("companyId", "pp30Period");

-- CreateIndex
CREATE UNIQUE INDEX "SalesDocument_companyId_number_key" ON "SalesDocument"("companyId", "number");

-- CreateIndex
CREATE INDEX "Expense_companyId_taxInvoiceDate_idx" ON "Expense"("companyId", "taxInvoiceDate");

-- CreateIndex
CREATE INDEX "Expense_companyId_status_idx" ON "Expense"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_companyId_number_key" ON "Expense"("companyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "WhtCertificate_expenseId_key" ON "WhtCertificate"("expenseId");

-- CreateIndex
CREATE INDEX "WhtCertificate_companyId_status_paymentDate_idx" ON "WhtCertificate"("companyId", "status", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "WhtCertificate_companyId_number_key" ON "WhtCertificate"("companyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Pp30Return_companyId_period_key" ON "Pp30Return"("companyId", "period");
