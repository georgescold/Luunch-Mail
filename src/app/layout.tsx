import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const headline = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-headline", weight: ["500", "600", "700", "800"], display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Luunch Mail — Plateforme e-mail tout-en-un",
  description: "Délivrabilité, cold outreach, marketing automation et API transactionnelle réunis dans un seul produit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${headline.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
