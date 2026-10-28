import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./styles/tokens.css";
import "./styles/a2.css";
import "./styles/shell.css";
import { bookshelf } from "@garden/bookshelf";
import { SiteChrome } from "./components/SiteChrome";
import {
  getSiteUrl,
  siteDescription,
  webmentionEndpoint,
} from "./lib/site";
import { githubUrl, siteConfig } from "./site.config";
import { brand } from "@garden/site-config";
import { FEED_ALTERNATES } from "./lib/page-alternates";
import { htmlLang, siteLang } from "./lib/i18n";

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
    alternates: { types: FEED_ALTERNATES },
    icons: {
      icon: [{ url: brand.favicon, type: brand.favicon.endsWith(".svg") ? "image/svg+xml" : undefined }],
      ...(brand.appleTouchIcon ? { apple: [{ url: brand.appleTouchIcon, sizes: "180x180" }] } : {}),
    },
    // index and follow are the default, so no robots meta is written here: the
    // 404 page keeps exactly one, the noindex vinext adds, and noindex pages set
    // their own. Only Google's preview limits are stated.
    robots: {
      googleBot: {
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
    <html lang={htmlLang(siteLang)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();',
          }}
        />
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
        <SiteChrome bookshelfSite={bookshelf != null}>{children}</SiteChrome>
      </body>
    </html>
  );
}
