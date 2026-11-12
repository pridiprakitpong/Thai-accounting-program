declare module "cloudflare:workers" {
  export const env: {
    DB?: import("@cloudflare/workers-types").D1Database;
    FILES?: import("@cloudflare/workers-types").R2Bucket;
    AUTH_SECRET?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    APP_ENV?: string;
  };
}

declare module "fontkit" {
  export function create(data: Uint8Array | ArrayBuffer): {
    unitsPerEm: number;
    layout(text: string): {
      glyphs: { codePoints: number[] }[];
      positions: { xAdvance: number; xOffset: number; yOffset: number }[];
    };
  };
}
