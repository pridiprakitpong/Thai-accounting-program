# ใบเขียว Bai Khiao Books

A small-company accounting app for Thailand: sales documents, purchase bills, withholding-tax certificates, and the monthly VAT and withholding returns. The interface is Thai, with an English toggle. The demo company is fictional.

## What it covers

- Company profile, bank accounts, and contacts. A contact is a customer, a vendor, or both, and is either a juristic person or an individual. Each contact stores a 13-digit tax ID and a branch (`00000` is the head office).
- Sales documents: quotation, invoice, and tax invoice/receipt. Numbers run by year (`TI2026-0001`). VAT is 7% exclusive, 7% inclusive, or none. PDF export is available in Thai and English.
- Expenses with a vendor, category, VAT at 7% or 0, and a withholding-tax rate of 0, 1, 2, 3, or 5 percent on each line. A bill can mix rates, for example rent at 5% and service at 3%. The tax invoice number and date are stored separately from the bill date. Proof files can be attached. Marking a bill paid records the payment date and bank account.
- Withholding certificates (50 ทวิ) created from paid expenses that withheld tax. A certificate is draft until it is confirmed.
- Monthly PP.30 (ภ.พ.30). Output VAT comes from sales tax invoices. Input VAT comes from expenses in the month of the **tax invoice date**, not the bill date. Excess VAT carries forward. Saving a month stores a draft and locks those documents so the same document is never counted in two months.
- Monthly PND53 for juristic vendors and PND3 for individuals, by **payment month**, from **confirmed** certificates only. Export is a Revenue Department-style pipe-delimited UTF-8 text file (central format: 25 header fields and 38 detail fields) plus an Excel workbook.
- A dashboard for the month’s sales, expenses, VAT payable or excess, and unpaid bills.
- Email and password sign-in. Every row belongs to a company, so more than one company can exist. The app currently signs each user into one company.

## Run it

Requirements: Node.js 22, npm, and Chrome or Chromium for PDF export.

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

After seeding, sign in with the demo account from `.env.example`:

- Email: `demo@bai-khiao.example`
- Password: `Demo1234!`

`AUTH_SECRET` signs the session cookie. Change it before sharing a deployment. The database is local SQLite (`prisma/dev.db`) and is not committed. Uploaded proof files go to `data/uploads/`, which is gitignored except for the placeholder.

PDF rendering uses the Chrome binary in `CHROME_PATH`. The example leaves it blank and the app tries common install paths. Sarabun is bundled for the PDF under the SIL Open Font License (`assets/fonts/OFL.txt`).

## Demo story

The seeded company is **บริษัท สยามใบเขียว จำกัด** / Siam Bai Khiao Co., Ltd.

October 2026 has more input VAT than output VAT, so the excess carries into November. One purchase is billed on 3 November, but its tax invoice is dated 28 October and it was paid on 5 November. That input VAT sits in October’s PP.30. The withholding tax sits in November’s PND53, and only because the certificate is confirmed. An unpaid electricity bill stays out of the PND return. A December certificate is still a draft, so it stays out too.

## Tax rules in this version

- Money is stored in satang and rounded half up.
- Sales VAT is calculated on the document total. Inclusive VAT uses `round(total × 100 / 107)`.
- Purchase VAT is 7% or 0 on the sum of the line bases.
- Withholding tax is calculated per line on the base, before VAT, then summed.
- A PP.30 document is counted in the month that claimed it, otherwise in its tax-point month. Void documents drop out. Updating a draft releases that month’s locks and claims the current set again.
- PND text follows the Revenue Department central format (รูปแบบข้อมูลกลาง, version used for PND53/PND3): UTF-8, `|` separators, CRLF, Buddhist-era dates, and at most three income types per payee sequence. It is a filing-style file for RD Prep / e-Filing, not a submission to the Revenue Department.

## Tests

```bash
npm test
```

The tests cover exclusive, inclusive, and zero VAT; mixed withholding rates; the one-satang difference between line VAT and document VAT; PP.30 carry-forward, including across an empty month; the rule that one document cannot be counted twice; input VAT following the tax-invoice month while PND follows the payment month and confirmed certificates only; and the PND text layout.

## Left for a later version

- Switching between several companies, invitations, and roles.
- Credit notes, debit notes, partial payments, and a full chart of accounts.
- Payroll and PND1, plus PND2.
- Choosing a later input-VAT month inside the six-month claim window.
- e-Tax invoice submission and a direct filing connection. The text file still needs the real e-Filing user id.
- Snapshots of the payee on a confirmed certificate, an audit log, and emailing documents.
- Postgres and object storage for a hosted deployment. The schema uses ordinary strings, integers, and relations so it can move off SQLite.
