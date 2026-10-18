import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./styles/tokens.css";
import "./styles/a2.css";
import "./styles/shell.css";
import { SiteChrome } from "./components/SiteChrome";
import {
  getSiteUrl,
  siteDescription,
  webmentionEndpoint,
} from "./lib/site";
import { githubUrl, siteConfig } from "./site.config";
import { brand } from "@garden/site-config";
import { HASH_JUMP_SCRIPT } from "../ui/garden/hash-jump.mjs";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteConfig.name,
      template: `%s · ${siteConfig.name}`,
    },
    description: siteDescription,
    authors: [{ name: siteConfig.author.name, url: githubUrl }],
    alternates: {
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
    icons: {
      icon: [{ url: brand.favicon, type: brand.favicon.endsWith(".svg") ? "image/svg+xml" : undefined }],
      ...(brand.appleTouchIcon ? { apple: [{ url: brand.appleTouchIcon, sizes: "180x180" }] } : {}),
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
      title: siteConfig.name,
      description: siteConfig.tagline,
      type: "website",
      locale: siteConfig.locale,
      images: [
        {
          url: "/og.png",
          width: 1731,
          height: 909,
          alt: `${siteConfig.name} · ${siteConfig.pages.home.title.replace("\n", "")}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: siteConfig.tagline,
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
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();',
          }}
        />
        {/* Before the router's scripts: keeps #links in a post from refetching the page (ui/garden/hash-jump.mjs). */}
        <script dangerouslySetInnerHTML={{ __html: HASH_JUMP_SCRIPT }} />
        {mentionEndpoint && <link rel="webmention" href={mentionEndpoint} />}
        {analyticsDomain && (
          <script
            defer
            data-domain={analyticsDomain}
            src={analyticsScript}
          />
        )}
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
