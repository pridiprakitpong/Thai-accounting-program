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

## Run it locally

Requirements: Node.js 22 and npm. PDF export does not need Chrome.

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This uses SQLite (`prisma/dev.db`, not committed) and stores proof files in `data/uploads/`.

After seeding, sign in with the demo account from `.env.example`:

- Email: `demo@bai-khiao.example`
- Password: `Demo1234!`

The demo account and the seed exist only for this local Next.js server. They are not created on Cloudflare. `AUTH_SECRET` in `.env` signs the local session cookie.

PDFs are drawn with pdf-lib. Sarabun is embedded from `lib/pdf/font-data.ts` (the font files under `assets/fonts/` are SIL Open Font License, see `assets/fonts/OFL.txt`).

## Cloudflare Workers

The public site runs on Cloudflare Workers through [vinext](https://github.com/cloudflare/vinext) (`@vinext/cloudflare`), which fits this Next.js 15 app and keeps `wrangler.jsonc`. OpenNext was the other option; vinext is the one wired up here. `npm run dev` stays on Next.js and SQLite. `npm run preview` builds the Worker and serves it with a local D1 database and R2 bucket.

```bash
cp .dev.vars.example .dev.vars
npm run preview
```

Preview listens on [http://127.0.0.1:8787](http://127.0.0.1:8787). `.dev.vars` is gitignored. The example values are for that local preview only:

- `AUTH_SECRET` signs the session.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are the only credentials `/setup` will accept.

On first launch, open `/setup`, enter that email and password, and create the company. The page redirects to sign-in once any user exists. `APP_ENV=production` is set on the Worker, so the login page does not offer the demo account and `prisma db seed` refuses to run.

Nothing has been deployed. The account `2141c75d142de588f4d6f28bf197a08e` is in `wrangler.jsonc`. D1 database `bai-khiao` and R2 bucket `bai-khiao-files` are not created yet. `database_id` is a placeholder. The first GitHub Actions run creates both, writes the real D1 id, applies `migrations/`, and deploys. Do not put a real company, password, or API token in the repo.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js on SQLite |
| `npm run build` | Prisma client, Worker-safe query compiler, vinext build |
| `npm run preview` | Build, apply the D1 migration locally, `wrangler dev` |
| `npm run deploy` | Build and `vinext-cloudflare deploy` (do not run until the token is ready) |

### Secrets to set before the first real request

These are Worker secrets, not GitHub secrets and not files in the repo:

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
```

Use a long random `AUTH_SECRET`. `ADMIN_EMAIL` and `ADMIN_PASSWORD` must match what you type on `/setup`. After the first admin exists, `/setup` locks itself.

### GitHub Actions

`.github/workflows/deploy.yml` runs on push to `main`. It installs, creates D1 and R2 if they are missing, runs `wrangler d1 migrations apply bai-khiao --remote`, and deploys. Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` = `2141c75d142de588f4d6f28bf197a08e`

Create the token on that account only. The first deploy creates a Worker that does not exist yet, so the token needs account-level edit, not a per-script editor token. In the dashboard that is:

- Account → Account Settings → Read
- Account → Workers Scripts → Edit
- Account → D1 → Edit
- Account → Workers R2 Storage → Edit

The API permission names are Account Settings Read, Workers Scripts Write, D1 Write, and Workers R2 Storage Write. Workers Scripts Write creates and updates the Worker and is what `wrangler secret put` uses. D1 Write creates the database and applies migrations. Workers R2 Storage Write creates the bucket. The Worker reads and writes objects through the `FILES` binding, so the token does not need object access.

### Workers limits

- D1's Prisma adapter throws if you use an interactive `$transaction`. The Worker runs those statements one after another (`lib/with-db.ts`). Local SQLite still uses a real transaction. Two requests can race on a document number.
- Workers refuse `new WebAssembly.Module()` / `WebAssembly.compile()`. Prisma's query compiler is uploaded already compiled (`scripts/patch-prisma-worker.mjs`). The local preview bundle is about 2.4MB gzipped, under the 3MB free-plan script limit, with not much room to spare.
- Chrome cannot run inside a Worker. PDFs are pdf-lib plus fontkit's browser build, with Sarabun embedded. Thai marks are positioned with fontkit's layout. The PND Excel file uses ExcelJS and the text file is plain text; both responded successfully in `wrangler dev`.
- Proof files go to the `FILES` R2 bucket (`receipts/…`). PDFs are generated when someone downloads them and are not stored.

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
- A hosted database with real transactions. Cloudflare D1 is wired up, and local development stays on SQLite. D1 cannot wrap the document-number and PP.30 writes in one transaction.
