import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Я AI Дехқон — Sun'iy intellekt dehqon",
  description:
    "O'simlik kasalliklari, zararkunandalar, o'g'it, sug'orish va hosildorlik bo'yicha Я AI Дехқон yordamchisi.",
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
