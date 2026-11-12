import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fontkitLayout from "fontkit";
import { bold, regular, semibold } from "./font-data";

type PositionedFont = {
  layout: (text: string) => {
    glyphs: { codePoints: number[] }[];
    positions: { xAdvance: number; xOffset: number; yOffset: number }[];
  };
  unitsPerEm: number;
};

const ink = rgb(0.11, 0.098, 0.08);
const muted = rgb(0.37, 0.34, 0.3);
const green = rgb(0.106, 0.369, 0.271);
const paper = rgb(0.969, 0.953, 0.918);

function decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const regularBytes = decode(regular);
const semiboldBytes = decode(semibold);
const boldBytes = decode(bold);
const layoutFonts = {
  regular: fontkitLayout.create(regularBytes) as unknown as PositionedFont,
  semibold: fontkitLayout.create(semiboldBytes) as unknown as PositionedFont,
  bold: fontkitLayout.create(boldBytes) as unknown as PositionedFont,
};

export type Weight = "regular" | "semibold" | "bold";

export class Sheet {
  readonly doc: PDFDocument;
  page: PDFPage;
  y = 800;
  private fonts: Record<Weight, PDFFont>;

  private constructor(doc: PDFDocument, fonts: Record<Weight, PDFFont>) {
    this.doc = doc;
    this.fonts = fonts;
    this.page = doc.addPage([595.28, 841.89]);
  }

  static async create(): Promise<Sheet> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fonts = {
      regular: await doc.embedFont(regularBytes, { subset: true }),
      semibold: await doc.embedFont(semiboldBytes, { subset: true }),
      bold: await doc.embedFont(boldBytes, { subset: true }),
    };
    return new Sheet(doc, fonts);
  }

  widthOf(text: string, size: number, weight: Weight = "regular"): number {
    const font = layoutFonts[weight];
    const run = font.layout(text || "");
    const scale = size / font.unitsPerEm;
    return run.positions.reduce((sum, position) => sum + position.xAdvance * scale, 0);
  }

  draw(text: string, x: number, y: number, size: number, weight: Weight = "regular", color: RGB = ink) {
    const fk = layoutFonts[weight];
    const pdfFont = this.fonts[weight];
    const run = fk.layout(text || "");
    const scale = size / fk.unitsPerEm;
    let cursor = x;
    for (let index = 0; index < run.glyphs.length; index += 1) {
      const codePoint = run.glyphs[index]?.codePoints?.[0];
      const position = run.positions[index];
      if (!position) continue;
      if (codePoint) {
        this.page.drawText(String.fromCodePoint(codePoint), {
          x: cursor + position.xOffset * scale,
          y: y + position.yOffset * scale,
          size,
          font: pdfFont,
          color,
        });
      }
      cursor += position.xAdvance * scale;
    }
    return cursor;
  }

  ensure(height: number) {
    if (this.y - height >= 48) return;
    this.page = this.doc.addPage([595.28, 841.89]);
    this.y = 800;
  }

  text(value: string, options?: { size?: number; weight?: Weight; color?: RGB; x?: number; gap?: number }) {
    const size = options?.size ?? 11;
    const x = options?.x ?? 40;
    this.ensure(size + 6);
    this.draw(value, x, this.y - size, size, options?.weight ?? "regular", options?.color ?? ink);
    this.y -= (options?.gap ?? size + 5);
  }

  rule() {
    this.ensure(12);
    this.page.drawLine({ start: { x: 40, y: this.y }, end: { x: 555, y: this.y }, thickness: 0.6, color: rgb(0.84, 0.8, 0.73) });
    this.y -= 12;
  }

  band(height: number) {
    this.ensure(height + 8);
    const top = this.y;
    this.page.drawRectangle({ x: 40, y: top - height, width: 515, height, color: paper });
    this.y = top - 16;
    return top;
  }

  async bytes(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

export { green, ink, muted };
