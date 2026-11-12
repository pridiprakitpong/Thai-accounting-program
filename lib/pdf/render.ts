import fs from "fs";
import path from "path";
import puppeteer, { type Browser } from "puppeteer-core";

let browserPromise: Promise<Browser> | null = null;
let fontCss: string | null = null;

function chromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((value): value is string => Boolean(value && value.trim()));
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("CHROME_NOT_FOUND");
}

function fonts(): string {
  if (fontCss) return fontCss;
  const load = (file: string, weight: number) => {
    const bytes = fs.readFileSync(path.join(process.cwd(), "assets/fonts", file));
    return `@font-face{font-family:Sarabun;src:url(data:font/ttf;base64,${bytes.toString("base64")}) format("truetype");font-weight:${weight};font-style:normal;}`;
  };
  fontCss = [load("Sarabun-Regular.ttf", 400), load("Sarabun-SemiBold.ttf", 600), load("Sarabun-Bold.ttf", 700)].join("");
  return fontCss;
}

async function browser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        executablePath: chromePath(),
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
}

export function pdfDocument(body: string, lang: string): string {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"/><style>${fonts()}*{box-sizing:border-box}body{margin:0;font-family:Sarabun,sans-serif;color:#1c1915;font-size:13px;line-height:1.45}</style></head><body>${body}</body></html>`;
}

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const instance = await browser();
  const page = await instance.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "14mm", left: "12mm", right: "12mm" },
    });
  } finally {
    await page.close();
  }
}
