import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Syncro | Team Task Manager",
  description: "Syncro is a high-performance team orchestration tool for fast-moving teams."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            className: "border border-white/10 bg-slate-950/90 text-slate-100"
          }}
        />
      </body>
    </html>
  );
}
