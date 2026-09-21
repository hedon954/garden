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

/** 站点身份来自根目录 site.config.yaml，由 garden sync 生成。 */
export const siteConfig = raw as SiteConfig;
export { githubUrl };
