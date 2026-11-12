export type Locale = "th" | "en";

export function tr(locale: Locale, th: string, en: string): string {
  return locale === "en" ? en : th;
}
