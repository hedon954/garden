import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: {
      default: "Hedon Log",
      template: "%s · Hedon Log",
    },
    description: "关于产品、工程、AI 学习与独立写作的长期个人博客。",
    authors: [{ name: "Hedon", url: "https://github.com/hedon954" }],
    alternates: {
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
    icons: {
      icon: "/favicon.svg",
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
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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
