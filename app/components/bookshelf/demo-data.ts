import type { BookshelfNote, BookshelfShelf } from "./types";

export const DEMO_CATALOG: BookshelfShelf[] = [
    {
      id: "tools",
      name: "工具与基础",
      books: [
        { id: "clean-code", title: "代码整洁之道", author: "Robert C. Martin", spine: "代码整洁之道", size: "s-tall", cover: true, note: "clean-code" },
        { id: "refactoring", title: "重构", author: "Martin Fowler", spine: "重构", size: "s-mid", cover: true, note: null },
        { id: "design-patterns", title: "设计模式", author: "GoF", spine: "设计模式", size: "s-tall", cover: true, note: null },
        { id: "mythical-man-month", title: "人月神话", author: "Frederick Brooks", spine: "人月神话", size: "s-mid", cover: true, note: null },
        { id: "zaji-1", title: "札记", author: "", spine: "札记", size: "thin", cover: false, filler: "sand", note: null },
        { id: "biji-1", title: "笔记", author: "", spine: "笔记", size: "thin", cover: false, filler: "cream", note: null },
      ],
    },
    {
      id: "eng",
      name: "工程实践",
      books: [
        { id: "continuous-delivery", title: "持续交付", author: "Jez Humble", spine: "持续交付", size: "s-tall", cover: true, note: null },
        { id: "phoenix-project", title: "凤凰项目", author: "Gene Kim", spine: "凤凰项目", size: "s-mid", cover: true, note: null },
        { id: "pragmatic-programmer", title: "程序员修炼之道", author: "David Thomas & Andrew Hunt", spine: "程序员修炼之道", size: "s-mid", cover: true, note: "pragmatic-programmer" },
        { id: "tdd", title: "测试驱动开发", author: "Kent Beck", spine: "测试驱动开发", size: "s-tall", cover: true, note: null },
        { id: "lean-startup", title: "精益创业", author: "Eric Ries", spine: "精益创业", size: "s-mid", cover: true, note: null },
        { id: "release-it", title: "发布！", author: "Michael Nygard", spine: "发布！", size: "s-short", cover: true, note: null },
        { id: "sre", title: "SRE 实践", author: "Google", spine: "SRE 实践", size: "s-mid", cover: true, note: null },
        { id: "zaji-2", title: "札记", author: "", spine: "札记", size: "thin", cover: false, filler: "sand", note: null },
        { id: "team-topologies", title: "团队拓扑", author: "Matthew Skelton", spine: "团队拓扑", size: "s-mid", cover: true, note: null },
        { id: "accelerate", title: "加速", author: "Nicole Forsgren", spine: "加速", size: "s-tall", cover: true, note: null },
      ],
    },
    {
      id: "arch",
      name: "领域与架构",
      books: [
        { id: "ddd", title: "领域驱动设计", author: "Eric Evans", spine: "领域驱动设计", size: "s-tall", cover: true, note: null },
        { id: "microservices", title: "微服务设计", author: "Sam Newman", spine: "微服务设计", size: "s-mid", cover: true, note: null },
        { id: "eaa", title: "企业应用架构模式", author: "Martin Fowler", spine: "企业应用架构模式", size: "s-mid", cover: true, note: null },
        { id: "ddia", title: "数据密集型应用", author: "Martin Kleppmann", spine: "数据密集型应用", size: "s-tall", cover: true, note: "ddia" },
        { id: "fundamentals-sa", title: "软件架构基础", author: "Mark Richards", spine: "软件架构基础", size: "s-short", cover: true, note: null },
        { id: "implementing-ddd", title: "实现领域驱动设计", author: "Vaughn Vernon", spine: "实现领域驱动设计", size: "s-mid", cover: true, note: null },
        { id: "biji-2", title: "笔记", author: "", spine: "笔记", size: "thin", cover: false, filler: "cream", note: null },
        { id: "systems-performance", title: "性能之巅", author: "Brendan Gregg", spine: "性能之巅", size: "s-mid", cover: true, note: null },
        { id: "clean-architecture", title: "架构整洁之道", author: "Robert C. Martin", spine: "架构整洁之道", size: "s-tall", cover: true, note: null },
      ],
    },
  ];

export const DEMO_NOTES: Record<string, BookshelfNote> = {
    "pragmatic-programmer": {
      title: "程序员修炼之道",
      body: `
        <h2>为什么还在读这本</h2>
        <p>不是为了清单打卡，是为了把「匠人感」拉回日常：小步验证、可逆决定、别把偶然当设计。</p>
        <h2>几条带走的</h2>
        <ul>
          <li>DRY 不是少敲几行字，是别让同一条知识活在两处。</li>
          <li>正交：改一处不该惊动无关处。</li>
          <li>抛出异常要够具体，吞掉异常等于撒谎。</li>
        </ul>
        <p>合上后仍会问自己：今天写的代码，半年后的我还认得出意图吗？</p>
      `,
    },
    "clean-code": {
      title: "代码整洁之道",
      body: `
        <h2>整洁不是洁癖</h2>
        <p>可读性是团队带宽。命名、函数长度、副作用边界，比任何风格指南都更直接决定协作成本。</p>
        <h2>记下的几条</h2>
        <ul>
          <li>函数做一件事，并且把它做完。</li>
          <li>注释解释「为什么」，别复述「做了什么」。</li>
          <li>坏味道先闻到，再谈重构顺序。</li>
        </ul>
        <p>Demo 笔记：正式站会换成完整读书笔记正文。</p>
      `,
    },
    ddia: {
      title: "数据密集型应用系统设计",
      body: `
        <h2>为什么这本难跳过</h2>
        <p>把复制、分区、事务、流处理放进同一张地图里。读完后「CAP」不再是面试口号，而是取舍清单。</p>
        <h2>带走的框架</h2>
        <ul>
          <li>可靠性 / 可扩展性 / 可维护性：先问系统要哪一项。</li>
          <li>写放大与读放大：每加一层缓存都要付账。</li>
          <li>一致性不是开关，是光谱。</li>
        </ul>
        <p>合上书，仍会用它的词汇表去审自己的服务边界。</p>
      `,
    },
  };

