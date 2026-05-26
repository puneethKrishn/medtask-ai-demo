import type { Metadata } from "next";
import localFont from "next/font/local";
import { SessionTimeoutProvider } from "@/components/session-timeout";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MedTask AI — Task Manager for Doctors",
  description:
    "AI-powered task management for clinics, hospitals, and solo practitioners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 font-[family-name:var(--font-geist-sans)]`}
      >
        <SessionTimeoutProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-[260px]">
              <div className="p-6 lg:p-8 max-w-5xl">{children}</div>
            </main>
          </div>
        </SessionTimeoutProvider>
      </body>
    </html>
  );
}
