import path from "path";
import type { NextConfig } from "next";

const workersStub = "./lib/cloudflare-workers-stub.ts";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1", "bcryptjs", "exceljs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  ...(process.env.VINEXT
    ? {}
    : {
        turbopack: { resolveAlias: { "cloudflare:workers": workersStub } },
        webpack: (config: {
          resolve: { alias: Record<string, string> };
          module: { rules: unknown[] };
        }) => {
          config.resolve.alias["cloudflare:workers"] = path.join(process.cwd(), "lib/cloudflare-workers-stub.ts");
          config.module.rules.push({ test: /\.wasm$/, type: "asset/resource" });
          return config;
        },
      }),
};

export default nextConfig;
