import type { NextConfig } from "next";
import { trailingSlashEnabled } from "./ui/garden/site-href.mjs";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  ...(process.env.STATIC_EXPORT === "1"
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
  // Always on in a static export; a server build opts in with TRAILING_SLASH=1. Links follow it (siteHref).
  trailingSlash: trailingSlashEnabled(process.env),
  // vinext 1.x, like Next.js, streams page metadata after the document shell to
  // clients that run JavaScript: title, canonical, RSS and robots would sit at the
  // end of <body> until a script moves them. Treating every user agent as
  // HTML-limited keeps them in <head> for everyone, as with vinext 0.0.x.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
