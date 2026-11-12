import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

export type AppBindings = {
  DB?: D1Database;
  FILES?: R2Bucket;
  AUTH_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  APP_ENV?: string;
};

export function bindings(): AppBindings {
  return (env ?? {}) as AppBindings;
}

export async function preloadBindings(): Promise<AppBindings> {
  return bindings();
}

export function isProduction(): boolean {
  return bindings().APP_ENV === "production" || process.env.APP_ENV === "production";
}

export function authSecret(): string {
  return bindings().AUTH_SECRET || process.env.AUTH_SECRET || "";
}
