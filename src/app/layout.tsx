import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ProfileProvider } from "@/hooks/useProfile";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Saath — Work, Rights & Support",
  description:
    "Together, by your side. Clear guidance for Indian gig and informal workers: earnings, safety, rights and schemes, documents, and complaint letters.",
  applicationName: "Saath",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/saath-logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/saath-logo.jpg", type: "image/jpeg" }],
  },
  appleWebApp: {
    title: "Saath",
  },
  openGraph: {
    title: "Saath — Work, Rights & Support",
    description: "Together, by your side.",
    images: [{ url: "/saath-logo.jpg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f6b4c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <LanguageProvider>
          <ProfileProvider>
            <AppShell>{children}</AppShell>
          </ProfileProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
