import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "../engine-app/globals.css";
import "../engine-app/styles/tokens.css";
import "../engine-app/styles/a2.css";
import "../engine-app/styles/shell.css";
import { SiteChrome } from "../engine-app/components/SiteChrome";
import { getSiteUrl } from "../engine-app/lib/site";
import { brand, siteLinks } from "@garden/site-config";
import { HANDBOOK_UI } from "../engine-app/lib/garden-docs-meta";

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getSiteUrl();
  const basePath = (siteLinks?.basePath ?? "/garden").replace(/\/+$/u, "");
  const docsBaseUrl = `${origin.replace(/\/+$/u, "")}${basePath}/`;
  const title = HANDBOOK_UI.zh.name;
  const description = "用 Markdown 写作、AI 协作表达智能 UI、通过 GitHub Pages 发布的个人博客框架用户手册。";

  return {
    metadataBase: new URL(docsBaseUrl),
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
    authors: [{ name: "Hedon", url: "https://github.com/hedon954/garden" }],
    icons: {
      icon: [{ url: brand.favicon, type: brand.favicon.endsWith(".svg") ? "image/svg+xml" : undefined }],
      ...(brand.appleTouchIcon ? { apple: [{ url: brand.appleTouchIcon, sizes: "180x180" }] } : {}),
    },
    robots: {
      googleBot: {
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "zh_CN",
      url: docsBaseUrl,
      images: [
        {
          url: `${basePath}/og.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${basePath}/og.png`],
    },
  };
}

export default function DocsRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        {analyticsDomain && (
          <script
            defer
            data-domain={analyticsDomain}
            src={analyticsScript}
          />
        )}
      </head>
      <body>
        <SiteChrome docsMode>{children}</SiteChrome>
      </body>
    </html>
  );
}
