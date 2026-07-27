import { parse } from "yaml";
import source from "../site.config.yaml?raw";

/** Fork 后编辑根目录 site.config.yaml。 */
export const siteConfig = parse(source) as {
  name: string;
  tagline: string;
  description: string;
  locale: string;
  author: { name: string; github: string; githubBio: string };
  pages: Record<"home" | "blog" | "thoughts" | "columns" | "about", {
    title: string;
    subtitle: string;
  }>;
  footer: string;
};

export const githubUrl = `https://github.com/${siteConfig.author.github}`;
