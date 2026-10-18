import type { NextConfig } from "next";
import { trailingSlashEnabled } from "./ui/garden/site-href.mjs";

const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === "1"
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
  // Always on in a static export; a server build opts in with TRAILING_SLASH=1. Links follow it (siteHref).
  trailingSlash: trailingSlashEnabled(process.env),
};

export default nextConfig;
