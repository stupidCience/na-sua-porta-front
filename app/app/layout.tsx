import type { Metadata } from "next";
import { Sora, Space_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ToastContainer } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/next";

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
  title: "Na Sua Porta - Entregas para Condomínios",
  description: "Plataforma de entregas internas para condomínios. Rápido, fácil e confiável 🚀",
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
      <body className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <ToastContainer />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-gray-100 border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-600">
            <p>&copy; 2024 Na Sua Porta. Todos os direitos reservados. 🏢</p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}

