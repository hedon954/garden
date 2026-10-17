---
title: ReAct 是更好的故事，Workflow 是更好的系统
description: 从一次电商 AI Agent 实践出发，聊聊 ReAct Agent、Workflow Agent，以及为什么业务生产系统最终还是要回到确定性。
date: '2026-06-15T21:58:37.000Z'
topic: AI Agent
tags:
  - AI Agent
cover: ai-agent-react-vs-workflow.jpg
---
最近一直在公司做一款电商方向的 AI Agent，大概是辅助购物类的 Agent，更具体的就不方便说了（虽然我也不知道有没有关系）。项目当然也还没成功，还未全面上线，不过在这个过程中，笔者也算积累了不少的经验（~~折磨~~），尤其是在 ReAct 和 Workflow 这两种架构模式上，有了一些个人的理解，所以就准备写篇文章来唠唠。

> 自从有了 AI 后，手写文章的次数和频率真是越来越少了。

本篇不是严格意义上的技术分享，也不是某个框架的最佳实践教程。笔者更想聊的是一个很现实的问题：为什么大家都喜欢做 ReAct Agent？为什么它在 Demo、PPT、社交媒体里面那么有吸引力？以及，为什么真正到了高频、低容错、强业务目标的生产场景里，笔者反而越来越觉得，Workflow 才是更现实的底座。

这里可以先给出笔者的个人观点：

> <span class="garden-callout-marker garden-callout-marker--info" aria-hidden="true"></span>
>
> **一句话核心**
>
> ReAct 是更好的故事，Workflow 是更好的系统。

当然，这句话不是说 ReAct 没有价值，也不是说 Workflow 能解决一切问题。更准确一点说，ReAct 适合处理那些路径未知、需要动态探索的问题；Workflow 适合承接那些目标明确、流程稳定、需要强兜底的业务系统。真正靠谱的生产架构，通常也不是二选一，而是让 Workflow 控制主流程，让 ReAct 只进入那些局部不确定、但又可以被验证和兜底的小闭环里。

### 什么是 ReAct、什么是 Workflow

先讲 Workflow。

Workflow 看名字就知道，它代表的是一个需要被前置定义好的工作流程。系统按照一个相对明确的执行图往下跑。它适合那些流程比较固定的场景，优点就是确定性高、稳定性强、好调试、好兜底，缺点也很明显：通用性较差，不太适合那种一开始就不知道要怎么做的开放性任务。

```garden figure
parts:
  - id: all
    label: 全部
    text: Workflow 看名字就知道，它代表的是一个需要被前置定义好的工作流程。系统按照一个相对明确的执行图往下跑。
  - id: flow
    label: 控制流
    text: Workflow 是人提前设计控制流
  - id: node
    label: 节点
    text: 模型只是某些节点里的能力组件
---
<svg viewBox="0 0 640 200" class="dx-svg g-flow" role="img" aria-label="Workflow：Input 到 Step 1，经 Gate 路由到 Step 2 或 Step 3，汇合到 Join 后输出 Output">
<defs><marker id="ah1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="fl-ah"/></marker></defs>
<rect x="8" y="22" width="624" height="170" rx="12" class="fl-group" data-p="flow"/><text x="20" y="40" class="dx-cap">Workflow（人提前设计的执行图）</text>
<g data-p="flow" class="fl-e"><line x1="78" y1="110" x2="104" y2="110" marker-end="url(#ah1)"/><line x1="196" y1="110" x2="226" y2="110" marker-end="url(#ah1)"/><line x1="300" y1="100" x2="340" y2="72" marker-end="url(#ah1)"/><line x1="300" y1="120" x2="340" y2="148" marker-end="url(#ah1)"/><line x1="432" y1="70" x2="470" y2="100" marker-end="url(#ah1)"/><line x1="432" y1="150" x2="470" y2="120" marker-end="url(#ah1)"/><line x1="548" y1="110" x2="566" y2="110" marker-end="url(#ah1)"/></g>
<rect x="18" y="94" width="58" height="32" rx="6" class="fl-n" data-p="io"/><text x="47" y="115" text-anchor="middle" class="dx-l">Input</text>
<rect x="106" y="94" width="88" height="32" rx="6" class="fl-n fl-m" data-p="node"/><text x="150" y="115" text-anchor="middle" class="dx-l">Step 1</text>
<path d="M264 84 L302 110 L264 136 L226 110 Z" class="fl-n" data-p="flow gate"/><text x="264" y="115" text-anchor="middle" class="dx-l">Gate</text>
<rect x="342" y="54" width="88" height="32" rx="6" class="fl-n fl-m" data-p="node"/><text x="386" y="75" text-anchor="middle" class="dx-l">Step 2</text>
<rect x="342" y="134" width="88" height="32" rx="6" class="fl-n fl-m" data-p="node"/><text x="386" y="155" text-anchor="middle" class="dx-l">Step 3</text>
<rect x="472" y="94" width="74" height="32" rx="6" class="fl-n" data-p="flow gate"/><text x="509" y="115" text-anchor="middle" class="dx-l">Join</text>
<rect x="568" y="94" width="58" height="32" rx="6" class="fl-n" data-p="io"/><text x="597" y="115" text-anchor="middle" class="dx-l">Output</text>
</svg>
```

ReAct 则不一样。ReAct 来自 `Reasoning and Acting`。在工程实现中，它通常被展开为 `Thought/Reasoning → Action → Observation` 的循环：模型先基于上下文生成下一步判断，再调用工具或执行动作，然后把外部观察结果重新放回上下文，继续下一轮决策。

```garden figure
parts:
  - id: all
    label: 全部
    text: 在工程实现中，它通常被展开为 `Thought/Reasoning → Action → Observation` 的循环
  - id: think
    label: Reasoning
    text: 模型先基于上下文生成下一步判断
  - id: act
    label: Action
    text: 再调用工具或执行动作
  - id: obs
    label: Observation
    text: 然后把外部观察结果重新放回上下文，继续下一轮决策。
  - id: exit
    label: 退出
    text: 模型不再产生 Tool Call，或者返回了最终答案，或者触发了最大轮次、异常、业务停止条件。
---
<svg viewBox="0 0 640 230" class="dx-svg g-flow" role="img" aria-label="ReAct：User task 进入 Prompt and tool schemas，模型推理后判断是否调用工具；是则得到工具结果或环境观察并回到推理，否则输出最终答案">
<defs><marker id="ah2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="fl-ah"/></marker></defs>
<rect x="8" y="10" width="13" height="13" rx="3" class="fl-n" data-p="io" style="display:none"/>
<rect x="8" y="78" width="80" height="34" rx="6" class="fl-n" data-p="io"/><text x="48" y="100" text-anchor="middle" class="dx-l">User task</text>
<rect x="104" y="20" width="528" height="200" rx="12" class="fl-group" data-p="loop"/><text x="116" y="38" class="dx-cap">ReAct（每一步由模型决定下一步）</text>
<line x1="88" y1="95" x2="118" y2="95" class="fl-e1" marker-end="url(#ah2)" data-p="io"/>
<rect x="120" y="78" width="110" height="34" rx="6" class="fl-n" data-p="ctx"/><text x="175" y="93" text-anchor="middle" class="dx-l">Prompt and</text><text x="175" y="106" text-anchor="middle" class="dx-l">tool schemas</text>
<line x1="230" y1="95" x2="258" y2="95" class="fl-e1" marker-end="url(#ah2)" data-p="loop"/>
<rect x="260" y="78" width="110" height="34" rx="6" class="fl-n fl-m" data-p="think loop"/><text x="315" y="100" text-anchor="middle" class="dx-l">Model reasoning</text>
<line x1="370" y1="95" x2="398" y2="95" class="fl-e1" marker-end="url(#ah2)" data-p="loop"/>
<path d="M450 68 L500 95 L450 122 L400 95 Z" class="fl-n" data-p="act loop exit"/><text x="450" y="99" text-anchor="middle" class="dx-l">Tool action?</text>
<line x1="450" y1="122" x2="450" y2="160" class="fl-e1" marker-end="url(#ah2)" data-p="act loop"/><text x="458" y="145" class="dx-cap">yes</text>
<rect x="330" y="162" width="240" height="34" rx="6" class="fl-n" data-p="obs loop"/><text x="450" y="184" text-anchor="middle" class="dx-l">Tool result or environment observation</text>
<path d="M330 179 L315 179 L315 114" class="fl-e1" fill="none" marker-end="url(#ah2)" data-p="obs loop"/>
<line x1="500" y1="95" x2="532" y2="95" class="fl-e1" marker-end="url(#ah2)" data-p="exit"/><text x="506" y="88" class="dx-cap">no</text>
<rect x="534" y="78" width="90" height="34" rx="6" class="fl-n" data-p="exit"/><text x="579" y="100" text-anchor="middle" class="dx-l">Final answer</text>
</svg>
```

从技术实现细节上看，很多 ReAct Agent 的退出条件都比较简单：模型不再产生 Tool Call，或者返回了最终答案，或者触发了最大轮次、异常、业务停止条件。也就是说，ReAct 的核心不是"固定执行哪几步"，而是"每一步都由模型根据当前上下文决定下一步"。

这就是 ReAct 和 Workflow 最根本的差异。

Workflow 是人提前设计控制流，模型只是某些节点里的能力组件；ReAct 是把相当一部分控制流交给模型，让模型在运行时边想边做。我们能做的就是通过 Prompt Engineering 去做引导、通过 Context Engineering 给予它更充分（有效）的上下文信息、通过 Harness Engineering 去进行约束控制帮助它进行自我纠正，以及通过 Loop Engineering 去定义验收标准从而指导它自我进化。ReAct 的优点就是高度灵活、通用性较强，但是缺点也非常明显：不可控、不稳定、难调试。

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Jun%2016,%202026,%2009_16_41%20AM%20(1).png)

很多复杂 Agent 架构都可以看成 ReAct Loop 的扩展，只不过有人在里面加了 Planner，有人加了 Memory，有人加了 Reflection，有人加了 Evaluator，有人加了多 Agent 协作，有人用图结构把它包起来。名字越来越多，架构图越来越复杂，但究其根本，都是 ReAct。

### ReAct 和 Workflow 怎么选

这 2 个咋选呢？答案可能是：

- Workflow：步骤明确的常规任务。
- ReAct：非固定流程，开放性问题。

笔者觉得比较抽象的答案是这样的：

- 你知道怎么做 ☞ Workflow
- 你不知道怎么做 ☞ ReAct

虽然比较糙，但是笔者觉得描述得还是比较准确的。

比如，用户要查订单、改地址、退款、投诉、申诉，这类任务虽然也会有各种边界 case，但主流程大体是明确的。你知道要查什么数据，知道要校验什么条件，知道成功和失败分别怎么处理，知道异常要怎么兜底。这个时候强行上一个全自由的 ReAct Agent，让它自己决定下一步要不要查订单、要不要校验状态、要不要调用退款工具，听起来很 AI Native，实际上就是把原本清清楚楚的业务流程交给一个概率模型去摇骰子。

但是，如果任务是"帮我分析一下为什么这个系统最近转化率下降了"，或者"帮我定位 Bug"，那你很难提前定义完整流程。它可能要查日志、看代码、跑测试、搜索历史 Issue、对比版本、猜测原因、验证假设。这个时候 ReAct 的优势就出来了，因为它可以根据每一步观察结果动态调整方向。

为了进一步讲清楚这个观点，我们需要对这 2 个模式进行更深入的比较。不过这里先亮出一个表格，不做过多的赘述，各位读者可以在后文中慢慢感受 😄。

| 维度       | ReAct Agent            | Workflow Agent         |
| ---------- | ---------------------- | ---------------------- |
| 控制流     | 动态生成               | 预先定义               |
| 规划方式   | 由 LLM 在运行时生成    | 由开发者提前设计       |
| 下一步动作 | 运行时由模型决定       | 执行前已经确定         |
| 可靠性     | 较低                   | 较高                   |
| 灵活性     | 较高                   | 较低                   |
| 成本       | 通常较高               | 通常较低               |
| 调试难度   | 更难调试               | 更容易调试             |
| 生产适用性 | 适合探索型、不确定任务 | 适合明确流程、业务系统 |

### 为什么大家都在做 ReAct Agent

看似 ReAct 和 Workflow 各有优劣，应该是各站半壁江山的场面，那为什么大厂和各种社交媒体里面，都在鼓吹它们做的 ReAct Agent~~（Demo）~~呢？

> <span class="garden-callout-marker garden-callout-marker--warning" aria-hidden="true"></span>
>
> **一句话核心**
>
> 一句话：好讲故事！

"死逻辑"的 Workflow 有啥好吹牛呢，那不就是传统业务流程换了个壳吗？那能跟 AI Native 有什么关系呢？随机应变、"全知全能"、能"自主进化"的 ReAct Agent，那才是真正的 AI Native！那才是 AI 时代"我们"应该做的事情！

Workflow 更像是一个 SOP，一个流程引擎，一个状态机。它可能更稳、更便宜、更好维护，但它不性感。你很难拿着一个"先查库存、再校验状态、再生成推荐、再兜底异常"的流程图去讲一个激动人心的 AI 故事。

但 ReAct 可以。

它可以讲"自主规划"，可以讲"动态决策"，可以讲"自我修复"，可以讲"像人一样工作"。这些词放在 PPT 里非常好看，放在 Demo 里也非常震撼。至于真实线上系统里它能不能稳定跑、成本能不能兜住、RT 能不能接受、异常能不能监控，那就是另外一回事了。

当然啦，上述观点肯定略显偏颇。笔者斗胆猜测，还有另外一个很重要的原因就是：Claude Code 和 Codex 这类 Coding Agent（当然它们不止 coding 能力）做得太好了，太突出了，太令人意外了。所以都认为能在他们的业务领域内做出比肩甚至超过 Claude Code、Codex 的 Agent。

### 为什么 Coding Agent 是一个特殊样本

笔者认为除了 Coding Agent，面向大众生活场景的业务，只有 Workflow 这一条路可以走。

更严谨的说法可能是：

> 在高频、低容错、强业务目标的消费级业务场景里，主控流应该优先选择 Workflow；ReAct 更适合作为局部不确定节点中的能力模块，而不是整个系统的主架构。

事实上，绝大部分业务系统的 ReAct Agent 演变着演变着就是  Workflow。

我们需要思考，为什么 Claude Code 和 Codex 能做得那么好？以及，它们真的就足够智能吗？真就那么 Agentic 吗？

笔者觉得不能只看模型本身。以现在 Transformer 为基础的大模型，说到底它仍然是一个概率模型。它可以表现出很强的推理行为，但从工程视角看，我们不能把它当成一个稳定、可验证、可重复的符号推理系统。所谓的 CoT，很多时候也不是严格意义上的"思考过程"，而是一种对思考过程的语言化模拟。

那想让它做得好至少需要以下几个前提：

1. **足够多的优质素材**：GitHub、Stack Overflow、开源项目、技术博客、Issue、PR、文档，这些东西给大模型提供了大量高质量代码和工程语料。代码世界虽然复杂，但它的表达形式高度结构化，而且很多问题在互联网上都留下过痕迹。
2. **足够健壮的验证设施**：软件工程发展了这么多年，编译器、类型系统、Lint、单元测试、集成测试、语法分析器、CI/CD、日志、监控，这些东西本来就是为了减少人类犯错而存在的。结果到了 Agent 时代，它们天然就变成了 ReAct 的 Observation 来源。模型写错了，编译器会骂它；测试挂了，测试结果会告诉它哪里不对；类型不匹配，IDE 和语言服务会直接提示。模型每犯一次错，都可能得到一个明确的外部反馈，然后继续修。

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Jun%2016,%202026,%2009_16_43%20AM%20(4).png)

这就很关键。ReAct 不是因为模型"突然有灵魂了"才强，而是因为它在 Coding 场景里有大量高质量、低成本、可自动化的反馈信号。

事实上，更重要的还有什么？还需要有人愿意主动去使用、去反馈、甚至去为它构建一系列的设施工具来增强它。Coding Agent 有大量专业的使用者，其中不乏大量自愿付费的使用者，他们在各种各样的业务场景下进行了各种各样的验证和反馈，才能让 Coding Agent 有如此快速和惊人的发展。

### 反观常规业务系统

那反观常规的业务系统呢？存在以下几个必须要面对的难题：

1. **好好的用户凭什么来用你的 AI Agent？**Claude Code 是开发者求爷爷告奶奶想方设法找各种路子去使用，业务 Agent 很多时候是业务方求着哄着用户来使用。一个是用户主动找工具解决强痛点，一个是产品希望用户来体验一个"看起来很智能"的新入口。这两者的起点完全不一样。
2. **盈利点在哪里？**整了那么多花里胡哨的"升级"后，带来的那点转化率的提升所带来的利润收入，真的能对冲其带来的额外维护成本和 token 费用吗？甚至更残酷一点，转化率真的有提升吗？
3. **真的适合吗？真的做得好吗？**你的业务场景真的适合上 ReAct Agent 吗？编程场景里有编译器、测试、类型系统、日志这些验证设施，可以不断给 Agent 纠偏。那你的业务场景里有吗？用户说"这个能买吗"，你能不能定义什么叫"能买"？是价格合适？成色合适？卖家可信？物流可控？售后风险低？还是用户当前预算和偏好匹配？这些判断很多时候并没有一个像单元测试那样明确的红绿灯。没有高质量 Observe，ReAct 的 Reason 就很容易变成自说自话。

除此之外，Claude Code、Codex 真的就那么强大、那么 Agentic 了吗？那为什么还需要开发者去维护那么多的 `CLAUDE.md`、`AGENTS.md`？搞什么 `skills`、`rules`、`commands`、`plugins`？即便有了这些，再搭配（当下）最强大的 Claude 模型，在有些场景下依旧表现很差，需要反复调教，甚至最后花了几百美刀后还是只能靠人工介入才能彻底解决。

除此之外，普通业务系统还有一个很大的矛盾：**错误容忍度非常低。**

常规业务系统本身就要容忍代码缺陷、脏数据、依赖异常、网络波动，现在你还要额外容忍一个不确定的 Agent。更麻烦的是，Agent 的错误不一定是直接失败，它可能是效果变差、回答变奇怪、推荐不稳定、语气不合适、状态判断轻微偏移。这种错误很可怕，因为它是温水煮青蛙式地变差。你要是监控系统做不到位，等知道的时候就已经晚了。

这还只是系统本身，还有另外一方面，**用户对错误的容忍度是多少？**

Coding Agent 跑几分钟、十几分钟，甚至更久，开发者很多时候是能接受的。因为手工 Coding 本来就慢，Agent 就算绕路，只要最后能把事情做成，用户也觉得值。但是消费级业务系统不一样。用户点一下按钮、发一句话，很多时候期望的是秒级甚至毫秒级响应。你 ReAct Loop 即便具备所谓的自我修复、自我纠正能力，可每多一轮思考，就多一次模型调用；每多一次工具调用，就多一次延迟；每多一次错误纠正，就多一层 token 成本。

这你的用户能接受吗？

还有一个问题是，**普通用户没有能力、也没有意愿帮你提升系统上限**。

常规的业务系统需要把用户当小白，尽可能让系统通用、易用、好用。你不敢让你的用户做太多的操作，因为每多一个步骤，你就害怕用户弃之而去。Coding Agent 不一样啊，它的受众绝大部分都是一群专业的开发者，他们天生就具备构建能力，他们也愿意去根据当下 Coding Agent 的不足去捣鼓各种技巧来提升 Agent 的上限。不仅如此，他们还乐于分享（~~真是该死~~）！他们会把自己的各种奇技淫巧分享在各大平台上，让那些本没那么专业的用户也能提升使用 Coding Agent 的能力。

### 于是我们踩了什么坑

为什么笔者会有这样的一些感想呢？回到开头，笔者提到，最近一直在公司做一款电商方向的 AI Agent。

AI 时代，我们要做肯定是要做 AI Native 产品嘛！所以就希望以 ChatBot 的形式来展现这款 AI Agent（笔者也不知道为什么 ChatBot 就是 AI Native 了...）。我们一上来就搞 ReAct Agent，那会刚好赶上 Claude Code "开源"（~~源码泄露~~），所以我们的口号必然就是：

> 对标 Claude Code。

demo 阶段当然是说得过去了，做 demo 谁不会呢？AI 时代，是个人都能做出吹上天的 demo。

但是随着需求的不断细化、验证过程中不断发现的一些边界 case 和异常情况，发现越来越兜不住了！那怎么办呢？Context Engineering 啊！调 Prompt，上 skill！还是不行怎么办呢？Harness Engineering！代码逻辑强行纠正，上正则，上规则判断，上各种兜底！

最后系统变成什么样子呢？

用 ReAct Agent 的架构，在 Prompt 里面塞一堆 Workflow 的硬规则指令。希望模型既能像 ReAct 一样灵活，又能像 Workflow 一样稳定；既能自主判断，又能严格遵守业务流程；既能泛化，又能确定性执行。

结果当然很尴尬。

模型根本不一定遵循指令。你让它走流程，它可能自己加戏；你让它自主判断，它又可能乱判断；即得不到 ReAct 的通用智能能力，也失去了 Workflow 的确定性和稳定性，"人财"两空。而且随着系统越来越复杂，这个弊端会指数型放大。

真是痛苦啊~

### 更现实的答案：Macro Workflow + Micro ReAct

```garden html
title: HTML
---
<style>
:host{display:block}
.wf{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font:500 14px/1.4 -apple-system,"PingFang SC","Noto Sans SC",sans-serif;color:var(--ink)}
.n{padding:9px 12px;border:1px solid var(--rule-strong);border-radius:8px;background:var(--card)}
.ar{color:var(--muted)}
.loop{padding:8px 10px 10px;border:1.5px dashed var(--blue);border-radius:10px;background:var(--blue-tint)}
.loop b{display:block;font-size:12px;color:var(--blue);margin-bottom:6px}
.loop .row{display:flex;gap:6px;align-items:center;font-size:13px}
.loop .row span{padding:5px 8px;border-radius:6px;background:var(--card);border:1px solid var(--blue-line)}
.cap{margin:10px 0 0;font:13px/1.5 -apple-system,"PingFang SC",sans-serif;color:var(--muted)}
</style>
<div class="wf" role="img" aria-label="Workflow 主流程中的一个节点是被关在小闭环里的 ReAct">
<span class="n">主流程</span><span class="ar">→</span><span class="n">状态机</span><span class="ar">→</span>
<span class="loop"><b>Micro ReAct（小闭环）</b><span class="row"><span>Thought</span>→<span>Action</span>→<span>Observation</span>↺</span></span>
<span class="ar">→</span><span class="n">校验 / 兜底</span><span class="ar">→</span><span class="n">输出</span></div>
<p class="cap">Macro Workflow：主流程、状态机、成本控制、权限控制、异常兜底、观测指标和业务确定性。示意图，节点顺序为示例。</p>
```

所以，综上所述，在笔者有限的认知看来，只要大模型的底层原理没有发生本质改变，传统业务为了 AI 而 AI，强行套上一个全局 ReAct Agent，从一开始就大概率不是一条好路。

更现实的选择是：Workflow 作为主控流，ReAct 作为局部能力。

也就是：

> Macro Workflow + Micro ReAct。

Workflow 负责主流程、状态机、成本控制、权限控制、异常兜底、观测指标和业务确定性。然后在一些传统工程手段做不到的地方、在一些传统机器学习、深度学习做不好的地方、在那些需要动态探索、但又能被局部验证的节点中，可以尝试利用大模型的泛化能力来提升上限，但是，它依旧需要控制在一个小的闭环范围内。

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Jun%2016,%202026,%2009_16_42%20AM%20(3).png)

说白了，不要让 ReAct 接管系统，只让它接管局部不确定性。

比如，在电商场景里，订单状态流转、支付校验、售后规则、风控拦截、库存状态，这些东西本来就应该是 Workflow。你不能让模型自由发挥。它可以解释规则，可以总结信息，可以生成话术，可以辅助判断，但它不应该随便决定业务状态怎么流转。

但是在一些模糊节点里，LLM 是有价值的。比如理解用户到底在纠结什么，判断用户是在问价格、成色、真假、风险还是决策建议；再比如从一堆非结构化信息里提取关键信号；再比如把平台已有的规则和商品上下文组织成用户能听懂的话。这些地方传统规则很难做得自然，传统机器学习也不一定够灵活，LLM 的泛化能力就可以派上用场。

关键在于，这个能力必须被关在一个小闭环里。

你要知道它什么时候进来，什么时候出去，输出怎么校验，失败怎么兜底，成本怎么控制，效果怎么监控。否则 ReAct 的灵活性很快就会变成系统的不确定性。

### 那应该怎么做

经过这段时间的折磨后，笔者觉得比较好的实践路径可能是这样的：

- 首先就不该为了 AI 而 AI，还是要从业务出发，去找到那些传统工程解决不好的点，去识别用户真正的痛点，然后去思考当下的 LLM 能否比较好的解决这些痛点。
- 好的思路不应该是上来就做一个所谓的 AI Native ChatBot，然后通过各种投流、奖励机制来"诱骗"用户过来使用。更好的方式可能是，系统实时陪伴用户，在用户真的遇到痛点、真的不知道怎么办的时候，Agent 恰当地出现。这个时候，利用平台的专业性、权威性和上下文优势，告诉用户：我知道你现在在苦恼什么，我可以帮你解决。这个时候用户主动使用的意愿和概率才会高。这个时候关键就在于你能否真的解决用户的问题，如果你能解决得好，那还愁没有用户来用吗？而且这个时候因为你是实实在在在解决用户的痛点，它的转化率（对应的昂贵的 token 成本）肯定就更优，才更有可能有盈利点（因为你还可以针对场景的收益高低选择不同的策略）。
- 从一个小的、局部的、高频率的、高优先级的、高确定性的点出发，再逐步扩大，即能快速看到效果，又能控制成本，又可以把异常情况缩小在一个可控的范围内。

别一上来就想做一个无所不能的 Agent。无所不能，通常意味着无所能稳定。

### 最后

所以，如果要用一句话总结笔者现在对 ReAct 和 Workflow 的理解，那就是：

**ReAct 是更好的故事，Workflow 是更好的系统。**

ReAct 的确更像 AI，也更好讲故事。它让人看到 Thought、Action、Observation，看到模型像一个人一样边想边做，这很迷人。但生产系统最终不是比谁更像人，而是比谁能稳定解决问题，谁能控制成本，谁能被观测，谁能被兜底，谁能在出错的时候快速定位和回滚。

所以，笔者现在越来越倾向于认为：在高频、低容错、强业务目标的消费级业务场景里，不应该让 ReAct 成为系统的主架构。主架构应该是 Workflow，ReAct 只应该作为局部不确定节点里的增强能力。

这可能没那么性感，也没那么 AI Native。

但它更像一个系统。

只不过这年头，哪有人愿意慢下来做事呢？

没辙咯~

