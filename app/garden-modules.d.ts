declare module "@garden/generated-content" {
    export type ContentEntry = {
    title: string;
    slug: string;
    path: string;
    description?: string;
    date: string;
    updated?: string;
    publishAt?: string;
    draft?: boolean;
    tags?: string[];
    references?: { title: string; url?: string; domain?: string }[];
    pinned?: boolean;
    readingTime?: string;
    kind: "post" | "column";
    sourcePath: string;
    content?: string;
    column?: string;
    columnTitle?: string;
    columnDescription?: string;
    columnStatus?: string;
    columnCover?: string;
    columnCoverAlt?: string;
    order?: number;
    cover?: string;
    /** Resized WebP copies of a local cover, when the build had sharp. */
    coverImage?: { src: string; srcset: string; width: number; height: number };
    original?: string;
  };

  export const contentHash: string;
  export const posts: ContentEntry[];
  export const columns: ContentEntry[];
  export type GardenDocEntry = {
    title: string;
    slug: string;
    path: string;
    description?: string;
    section?: string;
    sectionTitle?: string;
    order?: number;
    readingTime?: string;
    references?: { title: string; url?: string; domain?: string }[];
    sourcePath: string;
    content?: string;
    lang?: "zh" | "en";
  };
  export const gardenDocs: GardenDocEntry[];
  export const gardenIndexDoc: GardenDocEntry | null;
  export const gardenDocsEn: GardenDocEntry[];
  export const gardenIndexDocEn: GardenDocEntry | null;
  export const a2WordCounts: Record<string, number>;
  export type LinkCardMeta = {
    title: string;
    description?: string;
    siteName?: string;
    author?: string;
    publishedTime?: string;
    image?: string;
  };
  export type LinkAssets = { favicons: Record<string, string>; cards: Record<string, LinkCardMeta> };
  export const linkAssets: LinkAssets;
  /** Intrinsic sizes of body images by src, read at build time. */
  export const imageSizes: Record<string, { width: number; height: number }>;
}

declare module "@garden/generated-post-bodies" {
  export const postBodies: Record<string, string>;
}

declare module "@garden/generated-handbook-bodies" {
  export const handbookBodies: Record<string, string>;
}

declare module "@garden/site-config" {
  export const searchIndexUrl: string;
  /** The full-text index file and the hash its contents are cached under. */
  export const searchFull: { url: string; hash: string };
  /** The site address (site.config.yaml `url`, else SITE_URL) and base path, for spotting links back to the site. */
  export const siteLinks: { address: string; basePath: string; trailingSlash?: boolean };
  /** Header logo as inline SVG ("" when hidden) and icon URLs, from brand in site.config.yaml. */
  export const brand: { logo: string; favicon: string; appleTouchIcon: string };
  export const siteConfig: {
    name: string;
    tagline: string;
    description: string;
    locale: string;
    author: { name: string; github: string; githubBio: string; githubPinned?: string[] };
    pages: Record<string, Record<string, unknown>>;
    footer: string;
    linkPreview?: { worker?: string };
    url?: string;
    brand?: { logo?: string | false; favicon?: string; appleTouchIcon?: string | false };
  };
  export const githubUrl: string;
}
