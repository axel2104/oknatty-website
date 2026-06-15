import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OKNATTY - Creme Spalmabili Proteiche",
  description: "OKNATTY - Creme spalmabili proteiche che uniscono gusto e benessere. 21-22% proteine, senza olio di palma, basso zucchero, 100% naturale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col paper-texture" style={{ fontFamily: "'Fredoka', 'Comic Sans MS', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
