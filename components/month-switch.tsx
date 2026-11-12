import { shiftMonth } from "@/lib/format";
import { tr, type Locale } from "@/lib/i18n";

export function MonthSwitch({ period, locale, path }: { period: string; locale: Locale; path: string }) {
  return (
    <div className="month-switch">
      <a className="btn btn-ghost" href={`${path}?period=${shiftMonth(period, -1)}`}>
        ‹
      </a>
      <form action={path} method="get" className="inline">
        <input type="month" name="period" defaultValue={period} aria-label={tr(locale, "เดือน", "Month")} />
        <button className="btn btn-ghost" type="submit">
          {tr(locale, "ไป", "Go")}
        </button>
      </form>
      <a className="btn btn-ghost" href={`${path}?period=${shiftMonth(period, 1)}`}>
        ›
      </a>
    </div>
  );
}
