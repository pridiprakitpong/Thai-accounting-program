import { NextResponse } from "next/server";
import { isPeriod } from "@/lib/format";
import { getLocale } from "@/lib/locale";
import { pndExcel, getPndMonth } from "@/lib/services/pnd";
import { getSessionUser } from "@/lib/session";
import type { PndForm } from "@/lib/tax/pnd";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const form = url.searchParams.get("form") === "pnd3" ? "pnd3" : url.searchParams.get("form") === "pnd53" ? "pnd53" : null;
  const period = url.searchParams.get("period") ?? "";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "txt";
  if (!form || !isPeriod(period)) return new NextResponse("Bad request", { status: 400 });
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  if (format === "xlsx") {
    const locale = await getLocale();
    const workbook = await pndExcel(user.companyId, form as PndForm, year, month, locale);
    return new NextResponse(new Uint8Array(workbook.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${workbook.filename}"`,
      },
    });
  }
  const report = await getPndMonth(user.companyId, form, year, month);
  return new NextResponse(report.file.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.file.fileName}"`,
    },
  });
}
