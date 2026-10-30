import type { Metadata } from "next";
import { STIX_Two_Text, Figtree } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";

const stix = STIX_Two_Text({
  variable: "--font-stix",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hockey Performance Tracker",
  description: "See how sleep, confidence, stress and energy connect to your on-ice performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${stix.variable} ${figtree.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
