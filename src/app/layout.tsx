import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { AnalyticsProvider } from "@/components/analytics-provider";
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
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 font-[family-name:var(--font-geist-sans)]`}
      >
        <Suspense>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </Suspense>

        {/* GTM noscript fallback */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
      </body>
    </html>
  );
}
