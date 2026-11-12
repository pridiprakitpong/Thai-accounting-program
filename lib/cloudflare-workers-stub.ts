/** Stand-in used by `next dev` only. The Worker build imports the real `cloudflare:workers` module. */
export const env = {
  DB: undefined,
  FILES: undefined,
  AUTH_SECRET: undefined,
  ADMIN_EMAIL: undefined,
  ADMIN_PASSWORD: undefined,
  APP_ENV: undefined,
};
