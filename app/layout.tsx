import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import {
  getSiteUrl,
  siteDescription,
  webmentionEndpoint,
} from "./lib/site";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Hedon Log",
      template: "%s · Hedon Log",
    },
    description: siteDescription,
    authors: [{ name: "Hedon", url: "https://github.com/hedon954" }],
    alternates: {
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
    icons: {
      icon: "/favicon.svg",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: "Hedon Log",
      description: "写作、构建与保持好奇。",
      type: "website",
      locale: "zh_CN",
      images: [
        {
          url: "/og.png",
          width: 1731,
          height: 909,
          alt: "Hedon Log · 把复杂的事，慢慢想明白。",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Hedon Log",
      description: "写作、构建与保持好奇。",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mentionEndpoint = webmentionEndpoint();
  const analyticsDomain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  const analyticsScript =
    process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT ??
    "https://plausible.io/js/script.js";

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {mentionEndpoint && <link rel="webmention" href={mentionEndpoint} />}
        {analyticsDomain && (
          <script
            defer
            data-domain={analyticsDomain}
            src={analyticsScript}
          />
        )}
      </head>
      <body className={geistMono.variable}>
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <SiteHeader />
        <div id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
