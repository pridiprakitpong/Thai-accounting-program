import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { readUpload, safeDownloadName } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id, fileId } = await params;
  const file = await prisma.expenseFile.findFirst({
    where: { id: fileId, expenseId: id, expense: { companyId: user.companyId } },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });
  const bytes = await readUpload(file.storedName);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const filename = encodeURIComponent(safeDownloadName(file.filename));
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
    },
  });
}
