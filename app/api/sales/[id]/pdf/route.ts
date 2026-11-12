import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { salesPdf } from "@/lib/pdf/templates";
import { getSessionUser } from "@/lib/session";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "th";
  const doc = await prisma.salesDocument.findFirst({
    where: { id, companyId: user.companyId },
    include: { contact: true, lines: { orderBy: { position: "asc" } }, company: true },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });
  try {
    const pdf = await salesPdf({
      locale: lang as Locale,
      company: doc.company,
      contact: doc.contact,
      document: doc,
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.number}-${lang}.pdf"`,
      },
    });
  } catch {
    return new NextResponse("PDF rendering needs Chrome. Set CHROME_PATH.", { status: 500 });
  }
}
