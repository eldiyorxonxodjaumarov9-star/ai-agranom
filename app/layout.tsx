import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agro Olam AI Agronom — Sun'iy intellekt agronom",
  description:
    "O'simlik kasalliklari, zararkunandalar, o'g'it, sug'orish va hosildorlik bo'yicha AI Agronom yordamchisi.",
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
