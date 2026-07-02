import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Agro Olam — Aqlli Agro Marketplace",
  description:
    "Agro Olam — mahsulotlar, xizmatlar va AI agronom maslahatlari bir joyda. O'zbekistonning zamonaviy agro marketplace platformasi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
