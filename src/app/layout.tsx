import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ITNA Santé — Gestion",
  description: "Application de gestion pour centre de santé",
  icons: {
    icon: [{ url: "/itna.webp", type: "image/webp" }],
    apple: [{ url: "/itna.webp", type: "image/webp" }],
    shortcut: "/itna.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
