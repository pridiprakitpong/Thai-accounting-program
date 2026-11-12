"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale, variant = "dark" }: { locale: Locale; variant?: "dark" | "light" }) {
  const router = useRouter();
  function choose(next: Locale) {
    document.cookie = `bk_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <div className={`lang ${variant === "light" ? "site-lang" : ""}`}>
      <button type="button" className={locale === "th" ? "on" : ""} onClick={() => choose("th")}>
        ไทย
      </button>
      <button type="button" className={locale === "en" ? "on" : ""} onClick={() => choose("en")}>
        EN
      </button>
    </div>
  );
}
