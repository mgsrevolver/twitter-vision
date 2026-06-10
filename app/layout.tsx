import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "their feed — walk a mile in someone else's timeline",
  description:
    "A simulated X/Twitter timeline for any account or persona. Real tweets, imagined algorithm. No login, no tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-2xl px-4 py-10 text-center text-xs leading-relaxed text-ink-soft">
          <p>
            <Link href="/" className="font-[family-name:var(--font-fraunces)] text-sm text-ink">
              their feed
            </Link>
          </p>
          <p className="mt-2">
            Every post shown is a real post on X and links to the original. The <em>feed itself</em> is a
            simulation — we don&apos;t use the X API and can&apos;t see anyone&apos;s actual algorithmic timeline.
          </p>
          <p className="mt-2">
            No login. No cookies. No analytics. We collect nothing about you — feeds are generated from the URL
            alone, which is why they&apos;re shareable.
          </p>
        </footer>
      </body>
    </html>
  );
}
