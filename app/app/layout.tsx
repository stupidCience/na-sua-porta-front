import type { Metadata } from "next";
import { Sora, Space_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { RouteFooter } from "@/components/RouteFooter";
import { ToastContainer } from "@/components/Toast";
import { BRAND } from "@/lib/brand";

const geistSans = Sora({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Space_Mono({
  variable: "--font-geist-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.metadataTitle,
  description: BRAND.metadataDescription,
  icons: {
    icon: "/brand-mark.svg",
    shortcut: "/brand-mark.svg",
    apple: "/brand-mark.svg",
  },
  openGraph: {
    title: BRAND.metadataTitle,
    description: BRAND.metadataDescription,
    siteName: BRAND.name,
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
        <Header />
        <ToastContainer />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
        <RouteFooter />
      </body>
    </html>
  );
}

