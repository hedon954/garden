declare module "@garden/generated-content" {
  export type MediaItem = {
    type: "image" | "audio" | "video" | "link";
    src: string;
    alt?: string;
    poster?: string;
    mime?: string;
    title?: string;
    description?: string;
  };

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
    kind: "post" | "column" | "thought";
    sourcePath: string;
    content: string;
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
    mediaType?: "image" | "audio" | "video" | "link" | "text";
    media?: string | MediaItem[];
    mediaAlt?: string;
    poster?: string;
    linkTitle?: string;
    linkDescription?: string;
  };

  export const contentHash: string;
  export const posts: ContentEntry[];
  export const columns: ContentEntry[];
  export const thoughts: ContentEntry[];
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
}

declare module "@garden/site-config" {
  export const searchIndexUrl: string;
  export const siteConfig: {
    name: string;
    tagline: string;
    description: string;
    locale: string;
    author: { name: string; github: string; githubBio: string; githubPinned?: string[] };
    pages: Record<string, Record<string, unknown>>;
    footer: string;
    linkPreview?: { worker?: string };
  };
  export const githubUrl: string;
}
