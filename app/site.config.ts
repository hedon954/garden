import { githubUrl, siteConfig as raw } from "@garden/site-config";

export type PageCopy = {
  title: string;
  subtitle: string;
};

export type AboutPage = PageCopy & {
  heading?: string;
  paragraphs?: string[];
  quote?: string;
  focus?: string[];
  cta?: { href: string; label: string };
};

export type SiteConfig = {
  name: string;
  tagline: string;
  description: string;
  locale: string;
  logo: string;
  author: { name: string; github: string; githubBio: string; githubPinned?: string[] };
  pages: {
    home: PageCopy;
    blog: PageCopy;
    thoughts: PageCopy;
    columns: PageCopy;
    about: AboutPage;
    garden: PageCopy;
  };
  footer: string;
};

const DEFAULT_MARK = "/favicon.svg";

/** A site logo path, or the shared default mark. */
export function siteMark(logo?: string) {
  const value = logo?.trim() ?? "";
  if (value.startsWith("/") || value.startsWith(".") || /^https?:/i.test(value)) return value;
  return DEFAULT_MARK;
}

/** 站点身份来自根目录 site.config.yaml，由 garden sync 生成。 */
export const siteConfig = {
  ...raw,
  logo: siteMark(raw.logo),
} as SiteConfig;
export { githubUrl };

/** 列表页浏览器标题用站点名；页面大标题仍用 pages.*.title。 */
export const siteDocumentTitle = { absolute: siteConfig.name };
