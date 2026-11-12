import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "ใบเขียว Bai Khiao Books",
  description: "บัญชีขาย ภาษีซื้อ และหัก ณ ที่จ่ายสำหรับบริษัทขนาดเล็ก",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
