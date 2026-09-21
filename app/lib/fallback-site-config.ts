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
      title: "把复杂的事，\n慢慢想明白。",
      subtitle: "在这里记录产品、工程、学习与日常生活中值得慢慢想明白的事。",
    },
    blog: {
      title: "长期写下去，偶尔回头整理。",
      subtitle: "这里是完整文章：有明确主题、有持续论证，也允许自己在更新里修正旧判断。",
    },
    thoughts: {
      title: "不够写成文章的，也值得留下。",
      subtitle: "私人朋友圈式的轻量记录：短文字、照片、声音、影像，以及偶然遇见的链接。",
    },
    columns: {
      title: "把一个主题，写到足够深入。",
      subtitle: "专栏不是标签集合，而是一条有顺序的阅读路径。左侧章节导航会在阅读时始终陪着你。",
    },
    about: {
      title: "你好，我是 Your Name。",
      subtitle: "在这里写下你关心的问题、长期的方向，以及你希望如何与世界保持联系。",
      heading: "这个网站为什么存在",
      paragraphs: [
        "我需要一个不被信息流推着走的地方。长文可以慢慢展开，随想可以轻轻放下；同一个主题也可以沿着清晰的顺序持续生长。",
        "所有文章都从本地 Markdown 文件开始。这意味着我可以继续在 Typora 里写作，也意味着内容不会被某个编辑器或平台锁住。",
      ],
      quote: "写作不是把已经想明白的东西记下来，而是在句子之间发现自己还没有想明白什么。",
      focus: [
        "将自己的关注方向写在这里",
        "用文章积累可迁移的知识",
        "为长期写作留出稳定的空间",
      ],
      cta: {
        href: "/blog",
        label: "从博文开始",
      },
    },
    garden: {
      title: "一个基于 Markdown 的个人博客框架。",
      subtitle: "",
    },
  },
  footer: "保持独立，持续写作。",
};

export const githubUrl = `https://github.com/${siteConfig.author.github}`;
