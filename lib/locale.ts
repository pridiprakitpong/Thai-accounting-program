import { cookies } from "next/headers";
import type { Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return jar.get("bk_lang")?.value === "en" ? "en" : "th";
}
