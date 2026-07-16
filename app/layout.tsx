import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import ruLocale from "../locales/ru.json";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: ruLocale.metaTitle,
  description: ruLocale.metaDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  );
}
