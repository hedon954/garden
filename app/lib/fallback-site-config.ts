export const siteConfig = {
  name: "Garden",
  tagline: "写作 · 构建 · 保持好奇",
  description: "一个可 fork、可长期维护的 Markdown 个人博客系统。",
  locale: "zh_CN",
  author: {
    name: "Your Name",
    github: "your-github-id",
    githubBio: "Write a short introduction for your GitHub profile card.",
    githubPinned: [] as string[],
  },
  pages: {
    home: {
      title: "记一些正在做的事，\n和想清楚的问题。",
      subtitle: "关注软件工程、系统设计与技术实践，也记录偶发的探索和工作笔记。",
    },
    blog: {
      title: "博文",
      subtitle: "阶段性的完整梳理与技术总结。",
    },
    thoughts: {
      title: "随想",
      subtitle: "碎片的念头、偶遇的灵感、短笔记与链接。",
    },
    columns: {
      title: "专栏",
      subtitle: "按顺序组织的专题系列，沿着清晰的脉络连点成线。",
    },
    about: {
      title: "你好，我是 Your Name。",
      subtitle: "欢迎来到我的个人网站。",
      heading: "关于我与这里",
      paragraphs: [
        "一名工程师 / 创作者。平时主要关注系统开发、技术探索与软件设计。",
        "这里是我的公开工作台与数字自留地。比起社交网络上的碎片动态，我更倾向于把探索过程沉淀为有据可查的代码、设计与长篇笔记。",
      ],
      quote: "",
      focus: [
        "软件工程与系统架构",
        "原生工具与高质量交互",
        "个人长期知识沉淀",
      ],
      cta: {
        href: "/blog",
        label: "浏览博文",
      },
    },
    garden: {
      title: "一个基于 Markdown 的个人博客框架。",
      subtitle: "",
    },
  },
  footer: "持续记录与构建。",
};

export const githubUrl = `https://github.com/${siteConfig.author.github}`;
