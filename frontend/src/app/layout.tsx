import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Wachttijd-radar",
  description:
    "Portfolio-demo. Wachttijden in de medisch-specialistische zorg, per behandeling en per locatie. Bron: Nederlandse Zorgautoriteit.",
  // Deliberate. This is a portfolio build over a biweekly snapshot, and it must not
  // rank for real Dutch waiting-time searches: someone arriving from a search result
  // would take it for a service, which is the one way this site could mislead.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${archivo.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
