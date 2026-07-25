import config from "../site.config.json";

/** Fork 后编辑根目录 site.config.json，而不是在页面组件中搜索替换个人信息。 */
export const siteConfig = config;

export const githubUrl = `https://github.com/${siteConfig.author.github}`;
