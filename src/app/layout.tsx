import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roam — Set your vibe. Sign once. Just roam.",
  description: "AI-powered city day agent with one-time MetaMask permission",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="min-h-full bg-black text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
