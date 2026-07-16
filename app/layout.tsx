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

/** Prevent theme flash before hydration (next-themes) */
const themeInitScript = `
(function(){
  try {
    var key = 'agro-olam-theme';
    var stored = localStorage.getItem(key);
    var theme = stored || 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  );
}
