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
    topic?: string;
    tags?: string[];
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
    coverAlt?: string;
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
}

declare module "@garden/site-config" {
  export const siteConfig: {
    name: string;
    tagline: string;
    description: string;
    locale: string;
    author: { name: string; github: string; githubBio: string; githubPinned?: string[] };
    pages: Record<string, Record<string, unknown>>;
    footer: string;
  };
  export const githubUrl: string;
}
