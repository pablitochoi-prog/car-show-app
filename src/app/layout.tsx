import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/layout/footer";
import { UnreadMessagesShell } from "@/components/layout/unread-messages-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "CarShowApp - Discover & Manage Car Shows",
  description:
    "Find car shows near you, register your vehicles, and connect with the car enthusiast community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <UnreadMessagesShell>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <Footer />
        </UnreadMessagesShell>
      </body>
    </html>
  );
}
