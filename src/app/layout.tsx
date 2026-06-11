import type { Metadata } from "next";
import { Fredoka, Poppins, Roboto_Mono } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["400", "500", "600", "700"], display: "swap" });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400", "500", "600", "700"], display: "swap" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Luunch Mail — Plateforme e-mail tout-en-un",
  description: "Délivrabilité, cold outreach, marketing automation et API transactionnelle réunis dans un seul produit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${poppins.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
