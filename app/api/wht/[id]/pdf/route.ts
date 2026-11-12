import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { htmlToPdf } from "@/lib/pdf/render";
import { whtPdfHtml } from "@/lib/pdf/templates";
import { getSessionUser } from "@/lib/session";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "th";
  const certificate = await prisma.whtCertificate.findFirst({
    where: { id, companyId: user.companyId },
    include: { company: true, expense: { include: { contact: true, lines: { orderBy: { position: "asc" } } } } },
  });
  if (!certificate) return new NextResponse("Not found", { status: 404 });
  try {
    const pdf = await htmlToPdf(
      whtPdfHtml({
        locale: lang as Locale,
        company: certificate.company,
        contact: certificate.expense.contact,
        certificate,
        lines: certificate.expense.lines,
        category: certificate.expense.category,
      }),
    );
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${certificate.number}-${lang}.pdf"`,
      },
    });
  } catch {
    return new NextResponse("PDF rendering needs Chrome. Set CHROME_PATH.", { status: 500 });
  }
}
