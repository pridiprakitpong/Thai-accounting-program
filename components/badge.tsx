import type { ReactNode } from "react";

export function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "info" | "muted" | "danger";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
