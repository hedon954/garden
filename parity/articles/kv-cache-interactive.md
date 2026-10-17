---
title: 大模型推理：KV Cache 的底层原理、挑战与应对（互动版）
description: 本文从第一性原理出发，深入剖析了 KV Cache 的底层原理、挑战与应对，并给出了业内的常见解决方案。
date: 2026-09-18T14:39:00+08:00
topic: 大模型
tags:
  - 大模型
  - Transformer
  - 推理
cover: llm-kv-cache.jpg
references:
  - title: "KV Caching Explained: Optimizing Transformer Inference Efficiency"
    url: https://huggingface.co/blog/not-lain/kv-caching
  - title: Understanding and Coding the KV Cache in LLMs from Scratch
    url: https://magazine.sebastianraschka.com/p/coding-the-kv-cache-in-llms
  - title: 《从零构建大语言模型》
    url: https://github.com/rasbt/LLMs-from-scratch
  - title: GQA
    url: https://arxiv.org/abs/2305.13245
  - title: MQA
    url: https://arxiv.org/abs/1911.02150
  - title: DeepSeek-V2 / MLA
    url: https://arxiv.org/abs/2405.04434
  - title: "vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention"
    url: https://vllm.ai/blog/2023-06-20-vllm
  - title: 苏剑林：MHA→MLA
    url: https://spaces.ac.cn/archives/10091
  - title: "Hugging Face: Continuous Batching"
    url: https://huggingface.co/blog/continuous_batching
  - title: StreamingLLM
    url: https://arxiv.org/abs/2309.17453
  - title: Pope 等
    url: https://arxiv.org/abs/2211.05102
  - title: Efficient Memory Management for Large Language Model Serving with PagedAttention
    url: https://arxiv.org/abs/2309.06180
  - title: TensorRT-LLM KV Cache
    url: https://nvidia.github.io/TensorRT-LLM/features/kvcache.html
  - title: Orca
    url: https://www.usenix.org/conference/osdi22/presentation/yu
  - title: Fast and Expressive LLM Inference with RadixAttention and SGLang
    url: https://www.lmsys.org/blog/2024-01-17-sglang/
  - title: "SGLang: Efficient Execution of Structured Language Model Programs"
    url: https://arxiv.org/abs/2312.07104
  - title: vLLM Automatic Prefix Caching
    url: https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/
  - title: TensorRT-LLM KV Cache Reuse
    url: https://nvidia.github.io/TensorRT-LLM/advanced/kv-cache-reuse.html
  - title: vLLM Quantized KV Cache
    url: https://docs.vllm.ai/en/latest/features/quantization/quantized_kvcache/
  - title: TensorRT-LLM Quantization
    url: https://nvidia.github.io/TensorRT-LLM/features/quantization.html
  - title: KIVI
    url: https://arxiv.org/abs/2402.02750
  - title: DistServe
    url: https://arxiv.org/abs/2401.09670
  - title: Mooncake
    url: https://arxiv.org/abs/2407.00079
  - title: Splitwise
    url: https://arxiv.org/abs/2311.18677
  - title: FlexGen
    url: https://arxiv.org/abs/2303.06865
  - title: S-LoRA
    url: https://arxiv.org/abs/2311.03285
  - title: vLLM 前缀缓存设计
    url: https://docs.vllm.ai/en/latest/design/prefix_caching/
---

在开始之前，如果你对 KV Cache 没有一个大致概念上的了解的话，非常推荐你去阅读 Hugging Face 的 [KV Caching Explained: Optimizing Transformer Inference Efficiency](https://huggingface.co/blog/not-lain/kv-caching) 以及 Sebastian Raschka 大神发表的 [Understanding and Coding the KV Cache in LLMs from Scratch](https://magazine.sebastianraschka.com/p/coding-the-kv-cache-in-llms) 这两篇文章，它们都对 KV Cache 做出了由浅入深的讲解和介绍，并配备了利于理解的动画和图片，非常推荐先进行阅读，以便打下扎实的基础。

本篇主要是在上述两篇文章的基础上，针对 KV Cache 背后的一些更基础的底层原理，结合笔者的个人理解，进行进一步展开，同时会进一步阐述真实的系统在引入 KV Cache 之后要面临的问题挑战和业内的常见解决方案。

期待你能有所收获！Happy reading~

## 1. 什么是 KV Cache？

从名字上来看，KV Cache 是一种缓存技术，缓存的对象是注意力里的 `K`（Key）和 `V`（Value）。它的直接作用，是<u>在自回归生成时复用已经算过的 K/V，避免每生成一个新 token 都需要把历史重算一遍</u>。要充分理解这一点，我们必须先弄清楚 K、V 是什么，以及它们在 LLM 生成过程中所承担的角色和作用。笔者将在后文逐一展开。

我们先用一个简化过的图来演示这个过程：

![KV Cache Decoding Workflow](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2014,%202026,%2003_58_57%20PM-9372750.png)

我们知道，LLM 生成过程是一个 next token generation 的过程，如上图所示，带 prompt 的推理大致分为 2 个阶段：

```garden html
title: 步骤
---
<ol class="g-steps"><li><p class="g-step-t">Prefill</p><p>模型一次性处理已有上下文 <code>The cat is very cute</code>，算出并缓存这段的 K/V，同时生成第一个新 token <code>It</code>。</p>
</li><li><p class="g-step-t">Decode</p><p>再把 <code>It</code> 喂回去，生成 <code>seems</code>，然后继续往后。</p>
</li></ol>
```

在同一次请求里，KV Cache 的关键收益出现在 Decode：预测 `seems` 时，不必重算 `The cat is very cute` 的 K/V，只要算最新输入 `It` 的 K/V，追加进缓存即可。前一步（Prefill）已经算好的历史，直接拿来用——这就是省算力、加快推理的原因。

一步一步点开看，缓存是怎么长出来的：

```garden html
title: KV Cache 逐 token 解码演示
---
<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<style>:root{--ink:#1B1A18;--soft:#4A4844;--muted:#6E6B64;--rule:#E6E3DC;--rule-strong:#D6D2C9;--card:#fff;--blue:#2C55B4;--blue-tint:#EAF0FC;--blue-line:rgba(44,85,180,.28);--paper:#F8F7F3;--well:#F0EEE8}
#r{display:flow-root;padding:16px}body{margin:0;font:15px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",sans-serif;color:var(--ink);background:transparent}
button{font:600 14px/1 inherit;font-family:inherit;padding:10px 14px;min-height:40px;border-radius:8px;border:1px solid var(--rule-strong);background:var(--card);color:var(--ink);cursor:pointer}
button:hover{border-color:var(--blue-line)}button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}button:disabled{opacity:.45;cursor:default}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.cap{font-size:13px;color:var(--muted);margin:10px 0 0}
</style><script>function size(){var r=document.getElementById('r');if(r)parent.postMessage({type:'garden:resize',height:Math.ceil(r.getBoundingClientRect().bottom)+4},'*')}</script><main id="r"><style>
.toks{display:flex;flex-wrap:wrap;gap:6px;min-height:40px;align-items:center}
.t{padding:7px 10px;border-radius:6px;border:1px solid var(--rule-strong);font:500 14px/1 ui-monospace,Menlo,monospace;color:var(--ink);background:var(--card)}
.t.c{background:var(--blue-tint);border-color:var(--blue-line)}.t.n{border:1.5px dashed var(--blue)}.t.o{border-style:dotted;color:var(--muted)}
.ph{font-weight:700;margin:0 0 10px}.stp{color:var(--blue)}.ph small{font-weight:400;color:var(--muted);margin-left:8px}
.nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
.n{border:1px solid var(--rule);border-radius:10px;padding:10px 12px}.n b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.n span{font-size:12.5px;color:var(--muted)}
.lg{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--muted);margin-top:10px}.lg i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:5px;border:1px solid var(--blue-line);background:var(--blue-tint)}.lg i.n{background:none;border:1.5px dashed var(--blue)}
@media (max-width:420px){.n b{font-size:20px}}
</style>
<p class="ph" id="ph"></p><div class="toks" id="toks" aria-live="polite"></div>
<div class="nums"><div class="n"><b id="a">0</b><span>本步新算的 K/V</span></div><div class="n"><b id="rd">0</b><span>本步读取的历史 K/V</span></div><div class="n"><b id="c">0</b><span>缓存中的 K/V</span></div></div>
<div class="lg"><span><i></i>已在 KV Cache</span><span><i class="n"></i>本步新算并追加</span></div>
<div class="bar"><button id="prev" type="button">上一步</button><button id="next" type="button">下一步</button><button id="reset" type="button">重来</button></div>
<p class="cap">token 序列取自原文的例子；「（下一个 token）」只是占位。计数按 token 计，每个 token 在每一层都有一份 K/V。</p>
<script>
var P=['The','cat','is','very','cute'];
var S=[{ph:'准备',d:'prompt 还没进模型',toks:P.map(function(x){return [x,'o']}),a:0,rd:0,c:0},
{ph:'Prefill',d:'一次性处理已有上下文，算出并缓存这段的 K/V，同时生成第一个新 token It',toks:P.map(function(x){return [x,'n']}).concat([['→ It','o']]),a:5,rd:0,c:5},
{ph:'Decode · 第 1 步',d:'把 It 喂回去：只算 It 的 K/V 并追加，历史直接复用，生成 seems',toks:P.map(function(x){return [x,'c']}).concat([['It','n'],['→ seems','o']]),a:1,rd:5,c:6},
{ph:'Decode · 第 2 步',d:'再把 seems 喂回去：仍然只新算 1 份，但要读的历史变长了',toks:P.map(function(x){return [x,'c']}).concat([['It','c'],['seems','n'],['→（下一个 token）','o']]),a:1,rd:6,c:7}];
var i=0;function $(x){return document.getElementById(x)}
function draw(){var s=S[i];$('ph').innerHTML='<span class=stp>'+(i+1)+' / '+S.length+'</span>　'+s.ph+'<small>'+s.d+'</small>';$('toks').innerHTML=s.toks.map(function(t){return '<span class="t '+t[1]+'">'+t[0]+'</span>'}).join('');
$('a').textContent=s.a;$('rd').textContent=s.rd;$('c').textContent=s.c;$('prev').disabled=i===0;$('next').disabled=i===S.length-1;size()}
$('next').onclick=function(){if(i<S.length-1){i++;draw()}};$('prev').onclick=function(){if(i>0){i--;draw()}};$('reset').onclick=function(){i=0;draw()};draw();
</script></main><script>
addEventListener('message',function(e){if(e.source!==parent||!e.data||e.data.type!=='garden:theme')return;if(e.data.scheme==='dark'||e.data.scheme==='light')document.documentElement.style.colorScheme=e.data.scheme;var t=e.data.tokens||{};for(var k in t)if(/^--[a-z-]+$/.test(k)&&/^[#\w(),.% -]+$/.test(t[k]))document.documentElement.style.setProperty(k,t[k])});
addEventListener('resize',size);
</script>
```

> [!NOTE]
>
> 需要注意的是，上面说的是同一次请求内部的 K/V 复用（Decode 收益最大）。业内常说的「保持系统提示词稳定，提高缓存命中」，通常指在此之上的 **Prefix/Prompt Cache**，即跨请求复用已有前缀的 K/V，主要省的是 Prefill，后文会进一步展开讨论。

当然，这比较粗糙，相信大部分读者都有以下疑问：

- 图里的 Q/K/V 到底是什么？
- 它们在模型生成过程中扮演了什么角色和作用？具体是在哪个阶段起作用的？
- 为什么缓存的是 K 和 V？为什么不是 Q？

请继续往下阅读，我们逐一揭晓。

```garden html
title: 读懂了吗
---
<form class="g-quiz" data-g="quiz" data-answer="1"><fieldset><legend><span class="g-quiz-tag">读懂了吗</span>在同一次请求里，KV Cache 的关键收益出现在哪个阶段？</legend><label><input type="radio" name="qz1" value="0"> Prefill</label><label><input type="radio" name="qz1" value="1"> Decode</label><label><input type="radio" name="qz1" value="2"> 两个阶段一样多</label></fieldset><div class="g-quiz-row"><button type="submit">核对答案</button><p class="g-quiz-out" role="status" aria-live="polite"></p></div><div class="g-quiz-ex" hidden><p>Decode：预测 <code>seems</code> 时，不必重算 <code>The cat is very cute</code> 的 K/V，只要算最新输入 <code>It</code> 的 K/V，追加进缓存即可。</p></div></form>
```

## 2. KV Cache 的底层原理是什么？

要从根本上理解 KV Cache，我们必须先弄清楚 `K` 和 `V` 到底是什么。

### 2.1 Q/K/V 到底是什么？

这需要我们回到 Transformer 中的注意力机制。这里笔者要再次安利一下 Sebastian Raschka 大神撰写的书籍[《从零构建大语言模型》](https://github.com/rasbt/LLMs-from-scratch)，笔者也根据自身理解梳理了一篇 [读书笔记丨《从零构建大语言模型》](/columns/book-note/note/note-llm-from-scratch/#241-%E6%B3%A8%E6%84%8F%E5%8A%9B%E6%9C%BA%E5%88%B6)，欢迎阅读。

Sebastian Raschka 在书中分了 4 个阶段来逐步阐述 Transformer 的多头注意力机制，其中对于我们理解 `K` 和 `V` 最有帮助的是前 2 个阶段。笔者虽已在 [读书笔记丨《从零构建大语言模型》#2.4.1 注意力机制](/columns/book-note/note/note-llm-from-scratch/#241-%E6%B3%A8%E6%84%8F%E5%8A%9B%E6%9C%BA%E5%88%B6) 中进行了详细阐述，但仍然觉得有必要、也值得在本篇中再次进行叙述。

让我们考虑一下在大语言模型出现之前的没有注意力机制的架构中所存在的问题。假设我们想要开发一个将文本从一种语言翻译成另一种语言的语言翻译模型。如下图所示，由于源语言和目标语言的语法结构不同，我们无法简单地逐个单词进行翻译。

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/image-20250830202911825.png)

这正是传统的序列处理模型（如 RNN）一个根本缺陷的体现：**信息瓶颈**。它们通过一个循环结构顺序处理文本，导致序列末端的信息很难直接关联到序列开头的遥远信息。

> [!IMPORTANT]
>
> **自注意力机制 (Self-Attention)** 的提出，正是为了打破这种信息瓶颈。其根本思想是：**为序列中的每个元素，建立与其他所有元素的直接连接，并动态计算这些连接的强度（即注意力权重）**。这样，模型在处理任何一个词元时，都能拥有一个全局视野，直接审视并借鉴整个上下文。

所以注意力机制，就是要为输入序列中的每一个 token，计算出一个能包含整个上下文信息的向量（我们称之为上下文向量，Context Vector）。它是一种增强版的 embedding 向量，不仅包含了当前 token 自身的信息，还融合了序列中所有其他 token 的信息。这对于理解句子中单词间的关系至关重要。

为了理解这个上下文向量，让我们先从一个不含任何可训练权重的简化自注意力机制开始，来逐步理解其核心概念。

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/image-20250830204044917.png)

如上图所示，这个上下文向量的过程分为三步：

```garden html
title: 步骤
---
<ol class="g-steps"><li><p class="g-step-t">计算注意力分数</p><p>衡量每个词对其他词的&quot;相关性&quot;或&quot;相似度&quot;。计算每对词之间的点积，得到相似度分数。点积在这里可以被看作是一种衡量相似度的方式：两个向量的点积越大，代表它们之间的对齐程度或相似度越高，注意力分数也越高。</p>
</li><li><p class="g-step-t">归一化获取注意力权重</p><p>得到的注意力分数是一些原始的数值，它们的尺度不一。为了使其规范化并易于解释，我们使用 <strong>Softmax 函数</strong>对这些分数进行处理。Softmax 函数能将一组任意实数转换为一个概率分布，确保所有输出值的和为 1，并且每个值都是正数。这样得到的数值就是&quot;注意力权重&quot;，代表了在当前查询下，序列中每个词元的重要性。</p>
</li><li><p class="g-step-t">计算上下文向量</p><p>最后一步，将序列中的每一个词元嵌入向量与其对应的注意力权重相乘，然后将所有结果向量相加。最终得到的向量就是我们想要的上下文向量，它是整个输入序列的加权和，权重由刚刚计算出的注意力权重决定。</p>
</li></ol>
```

这 3 个步骤实现了自注意力机制的核心思想：

```garden compare
- { title: 看,   做什么: 计算每个词对其他词的关注度 }
- { title: 权衡, 做什么: 将关注度转换为权重 }
- { title: 融合, 做什么: 根据权重融合所有词的信息 }
```

最终效果：每个词的向量表示都包含了整个序列的上下文信息，而不仅仅是自己的信息。这样模型就能理解词与词之间的关系，比如 `"journey starts"` 中的 `"starts"` 会更多地关注 `"journey"` 的信息。

但是这里，**注意力机制本身没有自己独立的、可以在训练中被优化的参数**。模型在训练时，虽然可以学习和调整输入的 `x` 向量（即词嵌入本身），但它**无法学习如何更好地计算注意力**。无论输入的向量如何变化，计算注意力的公式始终不变。而且这种方式过于僵化。一个词元的向量表示 `x` 需要同时承载多种信息，它既要代表自身的语义，又要能很好地跟其他词元的向量进行点积来判断相关性。这就像要求一个人同时扮演运动员和裁判员，角色发生了混淆，难以做到最优。

所以第二个版本的根本问题就是：如何让模型**学会**去关注什么？如何让相似度的计算方式本身变得**灵活和强大**？

解决方案是引入角色分工，让专业的角色做专业的事。第二个版本中，我们不再直接使用原始的输入向量 `x`，而是引入三个独立的可训练线性变换层 (`nn.Linear`)：**Query (Q)**、**Key (K)** 和**Value (V)**。

```garden compare
- title: Query 查询向量
  代表: 当前这个词，主动去查询句子中其他词与自己的关系
  可以理解为: 我 (starts) 是谁？
- title: Key 键向量
  代表: 句子中的每个词，用来被其他词查询的
  可以理解为: 我是 (journey)，你可以通过这个'键'来了解我
- title: Value 值向量
  代表: 句子中每个词所携带的真正信息
  可以理解为: 一旦查询完毕，确定了关系密切度，我们就从这个值中提取信息
```

至关重要的是，这三个权重矩阵 $W_q$、$W_k$、$W_v$ 是**可训练的**。这意味着在训练过程中，模型会不断优化它们，学会如何将原始输入 `x` 转换成最有效的 Q、K 和 V，从而学会**如何更好地去关注**，让注意力的计算本身变得灵活而强大。（所以才称这个版本是带可训练权重的自注意力机制）。

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/1*moKYjUdtx-uEyYMbhPWbIw.png)

然后我们按照前面的 3 步计算逻辑，替换为用 $W_q$、$W_k$、$W_v$ 来进行计算，就可以得到可训练的上下文向量了，如下图所示：

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/1*6BEwO4jKy9UC7AzU6nIPPg.png)

到这里，我们才真正理解了 KV Cache 中的 KV 到底是什么。

> [!IMPORTANT]
>
> **一言以蔽之：**
>
> Q 是当前 token 的「提问」，K 是各 token 的「索引标签」，V 是可被取用的「内容」。注意力用 Q 与所有（因果可见的）K 算相似度，经 Softmax 得到一组权重，再按权重把各 V 合成一个上下文向量，而不是只取最相关的那一个。
>
> 这个上下文向量再经输出投影、FFN 和后续层，最终变成词表 logits，从而采样出下一个 token。Decode 时历史 K/V 可缓存复用。每步只需为最新输入算新的 Q/K/V，其中新的 K/V 追加进 Cache，Q 只用于本步查询。

把这段话画成一张可以点的图：

```garden figure
parts:
  - id: all
    label: 全部
    text: Decode 第 1 步：用最新输入 `It` 的 Q，去查询历史上的 K、按权重混合 V……
  - id: q
    label: Q
    text: Q 是当前 token 的「提问」……
  - id: k
    label: K
    text: K 是各 token 的「索引标签」……
  - id: v
    label: V
    text: V 是可被取用的「内容」……
  - id: cache
    label: KV Cache
    text: 历史上的 K/V 会被以后每一步的新 Q 反复读到，所以要写入 KV Cache……
  - id: out
    label: 输出
    text: 这个上下文向量再经输出投影、FFN 和后续层……
---
<svg viewBox="0 0 580 270" class="dx-svg" role="img" aria-labelledby="dxT"><title id="dxT">一次 Decode 步里的注意力：当前 token It 的 Q 与所有 K 算相似度，按权重混合 V</title>
<rect data-p="cache" class="dx-cache" x="12" y="38" width="460" height="82" rx="10"/><text x="20" y="134" class="dx-cap" data-p="cache">KV Cache（历史 token 的 K/V，复用）</text>
<g><text x="58" y="30" class="dx-tok" text-anchor="middle">The</text><rect data-p="k" class="dx-k" x="20" y="44" width="76" height="30" rx="6"/><text x="58" y="64" text-anchor="middle" class="dx-l">K</text><rect data-p="v" class="dx-v" x="20" y="82" width="76" height="30" rx="6"/><text x="58" y="102" text-anchor="middle" class="dx-l">V</text></g><g><text x="150" y="30" class="dx-tok" text-anchor="middle">cat</text><rect data-p="k" class="dx-k" x="112" y="44" width="76" height="30" rx="6"/><text x="150" y="64" text-anchor="middle" class="dx-l">K</text><rect data-p="v" class="dx-v" x="112" y="82" width="76" height="30" rx="6"/><text x="150" y="102" text-anchor="middle" class="dx-l">V</text></g><g><text x="242" y="30" class="dx-tok" text-anchor="middle">is</text><rect data-p="k" class="dx-k" x="204" y="44" width="76" height="30" rx="6"/><text x="242" y="64" text-anchor="middle" class="dx-l">K</text><rect data-p="v" class="dx-v" x="204" y="82" width="76" height="30" rx="6"/><text x="242" y="102" text-anchor="middle" class="dx-l">V</text></g><g><text x="334" y="30" class="dx-tok" text-anchor="middle">very</text><rect data-p="k" class="dx-k" x="296" y="44" width="76" height="30" rx="6"/><text x="334" y="64" text-anchor="middle" class="dx-l">K</text><rect data-p="v" class="dx-v" x="296" y="82" width="76" height="30" rx="6"/><text x="334" y="102" text-anchor="middle" class="dx-l">V</text></g><g><text x="426" y="30" class="dx-tok" text-anchor="middle">cute</text><rect data-p="k" class="dx-k" x="388" y="44" width="76" height="30" rx="6"/><text x="426" y="64" text-anchor="middle" class="dx-l">K</text><rect data-p="v" class="dx-v" x="388" y="82" width="76" height="30" rx="6"/><text x="426" y="102" text-anchor="middle" class="dx-l">V</text></g><g><text x="518" y="30" class="dx-tok" text-anchor="middle">It</text><rect data-p="kn" class="dx-k dx-new" x="480" y="44" width="76" height="30" rx="6"/><text x="518" y="64" text-anchor="middle" class="dx-l">K</text><rect data-p="vn" class="dx-v dx-new" x="480" y="82" width="76" height="30" rx="6"/><text x="518" y="102" text-anchor="middle" class="dx-l">V</text></g>
<g data-p="attn" class="dx-attn"><line x1="518" y1="150" x2="58" y2="76" /><line x1="518" y1="150" x2="150" y2="76" /><line x1="518" y1="150" x2="242" y2="76" /><line x1="518" y1="150" x2="334" y2="76" /><line x1="518" y1="150" x2="426" y2="76" /><line x1="518" y1="150" x2="518" y2="76" /></g>
<rect data-p="q" class="dx-q" x="480" y="150" width="76" height="30" rx="6"/><text x="518" y="170" text-anchor="middle" class="dx-l">Q</text>
<g data-p="out"><rect class="dx-o" x="150" y="214" width="230" height="34" rx="8"/><text x="265" y="236" text-anchor="middle" class="dx-l">上下文向量 → … → logits → seems</text></g>
</svg>
```

更完整的过程可以参考下图：

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2014,%202026,%2007_42_58%20PM.png)

### 2.2 为什么不缓存 Q？

到这里就很好解释了。Decode 的每一步，都是用**当前最新输入 token** 的 Q，去查询历史上的 K、按权重混合 V，得到上下文向量，再经后续层预测下一个 token。

因此只有当前这一步的 Q 会参与计算，更早 token 的 Q 只在它们自己当输入的那一步用过，之后不会再被拿来查询，自然无需缓存。相比之下，历史上的 K/V 会被以后每一步的新 Q 反复读到，所以要写入 KV Cache。

```garden html
title: 读懂了吗
---
<form class="g-quiz" data-g="quiz" data-answer="1"><fieldset><legend><span class="g-quiz-tag">读懂了吗</span>Decode 时为什么不缓存更早 token 的 Q？</legend><label><input type="radio" name="qz2" value="0"> Q 太大，存不下</label><label><input type="radio" name="qz2" value="1"> 更早 token 的 Q 只在它们自己当输入的那一步用过，之后不会再被拿来查询</label><label><input type="radio" name="qz2" value="2"> Q 每一步都会被重新训练</label></fieldset><div class="g-quiz-row"><button type="submit">核对答案</button><p class="g-quiz-out" role="status" aria-live="polite"></p></div><div class="g-quiz-ex" hidden><p></p></div></form>
```

## 3. KV Cache 带来了哪些挑战？

世人都在夸 KV Cache，那 KV Cache 本身存在哪些局限性呢？它又引入了哪些挑战呢？

### 3.1 局限性

首先 KV Cache 解决的是"不要重复计算过去 token 的 K/V"，但代价是必须长期保存并反复读取越来越大的历史状态。

而且 KV Cache 也没有让 Attention 变成 $O(1)$，生成第 $t$ 个 token 的时候，当前 Q 仍然需要和历史所有的 K 做匹配，所以单个 Decode Step 仍然随着 context 增长，近似于 $O(t)$。

另外，随着 token 序列增长，每生成一个 token，都需要读取大量的 K/V，这很容易造成在长上下文时，GPU 算力可能根本没吃满，反而一直在等待显存。这时候就事与愿违了：

> 缓存本来是为了提速，但缓存太大之后，"读取缓存"本身又成为瓶颈。

还有，KV Cache 只是省了历史计算，并没有把整个模型缓存掉。生成新 token 时仍然需要经历模型的所有层，它无法做到"这个问题模型以前思考过，所以答案直接拿出来"，每次还是需要让模型重新"思考"。

这些局限性，本身又构成了生产环境中部署模型时避不开的核心挑战。

### 3.2 挑战

笔者认为最核心是 3 个挑战：

> [!IMPORTANT]
>
> **存不下、读太慢、难管理。**

首先是**存不下**，这很明显，因为我们要缓存历史的 K/V，那必然要占据一定的内存，而且，对话越长，缓存的内容就越多。而且这个增量是 $O(N^2)$ 级别的。

> KV Cache 大小 ≈「有多少份 K/V」×「每一份有多长」×「每个数字占几个字节」。

具体来说，对于一个请求：

$$
\text{显存字节数} \approx 2 \times L \times T \times H_{kv} \times D \times B \times b
$$

| 符号     | 含义                                               |
| :------- | :------------------------------------------------- |
| 2        | 既有 K，又有 V，所以乘 2                           |
| L        | Transformer 层数（每一层都要存自己的 K/V）         |
| T        | 序列长度 = prompt 长度 + 已经生成的长度            |
| $H_{kv}$ | KV 头的个数                                        |
| D        | 每个头的维度（head dim）                           |
| B        | batch：同时在跑的条数                              |
| b        | 每个数占几个字节：FP16/BF16 → 2；FP8 → 1；INT8 → 1 |

举个例子：

- $L = 32$ 层
- $H_{kv} = 32$
- $D = 128$
- $T = 4096$
- $B = 1$
- $\text{BF16} \to b = 2$

$$
2 \times 32 \times 4096 \times 32 \times 128 \times 1 \times 2 = 2{,}147{,}483{,}648 \text{ 字节} \approx 2 \text{ GB}
$$

也就是 4096 token 的 prompt，就需要 2GB 的内存作为缓存，而且随着生成，它还会继续膨胀。单人使用的时候 B=1，但是线上在线服务，都是并发处理请求的，如果 B=16（16 个用户并发），那 $16×2 GB=32GB$，32 个用户并发那就是 $32×2 GB=64GB$，膨胀速度惊人。

```garden stat
- { value: "≈ 2", unit: GB, label: 一个 4096 token 的请求（L = 32、Hkv = 32、D = 128、BF16） }
```

```garden chart
type: bar
title: KV Cache 随并发线性膨胀
unit: GB
data: [{ x: "B = 1", y: 2 }, { x: "B = 16", y: 32 }, { x: "B = 32", y: 64 }]
caption: 数字来自原文：每个请求 ≈ 2 GB
```

换几组参数自己算一算：

```garden html
title: 换几组参数
---
<div class="g-play g-calc" data-g="calc"><script type="application/json">{"formula":"2 * L * T * Hkv * D * B * b","vars":{"T":{"label":"序列长度","values":[1024,2048,3072,4096,8192,16384,32768],"default":4096},"B":{"label":"并发","min":1,"max":32,"default":1},"Hkv":{"label":"注意力结构","options":{"MHA：32（原文例子）":32,"GQA：8 组（示例）":8,"MQA：1":1}},"b":{"label":"精度","options":{"BF16 / FP16":2,"FP8 / INT8":1}},"L":{"fixed":32},"D":{"fixed":128}},"format":"GB","unit":"bytes","show":"2 × {L} × {T} × {Hkv} × {D} × {B} × {b}"}</script><p class="g-play-f">显存字节数 ≈ 2 × L × <b>T</b> × <b>H<sub>kv</sub></b> × D × <b>B</b> × <b>b</b></p><label class="g-range"><span>序列长度</span><input type="range" min="0" max="6" step="1" value="3" data-k="T"><output>4096</output></label><label class="g-range"><span>并发</span><input type="range" min="1" max="32" step="1" value="1" data-k="B"><output>1</output></label><fieldset class="kv-seg"><legend>注意力结构</legend><label><input type="radio" name="opt-Hkv" data-k="Hkv" value="32" checked><span>MHA：32（原文例子）</span></label><label><input type="radio" name="opt-Hkv" data-k="Hkv" value="8"><span>GQA：8 组（示例）</span></label><label><input type="radio" name="opt-Hkv" data-k="Hkv" value="1"><span>MQA：1</span></label></fieldset><fieldset class="kv-seg"><legend>精度</legend><label><input type="radio" name="opt-b" data-k="b" value="2" checked><span>BF16 / FP16</span></label><label><input type="radio" name="opt-b" data-k="b" value="1"><span>FP8 / INT8</span></label></fieldset><p class="g-play-out" aria-live="polite">≈ <b data-out></b></p><p class="g-play-note mono" data-calc></p><p class="g-play-note">MLA 缓存的是压缩后的 latent，不能直接套这个公式（见 4.1）。</p></div>
```

**读太慢**问题也就呼之欲出了，每生成一个新 token，都要去读到目前为止存下来的全部历史 K/V。历史越长，读得越多。读得越多，读得越慢。甚至带宽大小都会成为问题。

跟操作系统一样，内存有申请，就需要释放。线上不止一个人。有人 prompt 短、有人很长；有人聊完了，有人还在生成。在申请和释放过程中，就会造成内存碎片，那就会出现剩余总空间足够但是却无法为新来的请求申请一大片足够的连续空间，这也就引入了内存碎片和内存淘汰等**难管理**的问题了。（相信这里，联想操作系统的虚拟内存管理方案，你也大概能想到一些解决方案了~ 😀）

> [!NOTE]
>
> 当然还有其他更加复杂的问题，比如说跨请求如何复用？多张 GPU 上 K/V 怎么切分？Prefill、Decode 分离的话 K/V 如何传输？不同 LoRA 层的 K/V 是不能共享的，这个时候怎么做隔离？这诸多问题已超过本篇和笔者的知识范畴了，本篇便不一一展开了，笔者会在后文贴出 AI 推荐的相关文章，感兴趣的读者也自行查阅。

```garden html
title: 读懂了吗
---
<form class="g-quiz" data-g="quiz" data-answer="0"><fieldset><legend><span class="g-quiz-tag">读懂了吗</span>公式里开头的 2 是什么？</legend><label><input type="radio" name="qz3" value="0"> 既有 K，又有 V</label><label><input type="radio" name="qz3" value="1"> BF16 每个数占 2 字节</label><label><input type="radio" name="qz3" value="2"> Prefill 和 Decode 各存一份</label></fieldset><div class="g-quiz-row"><button type="submit">核对答案</button><p class="g-quiz-out" role="status" aria-live="polite"></p></div><div class="g-quiz-ex" hidden><p></p></div></form>
```

## 4. KV Cache 挑战的应对方案

|   # | 问题             | 核心矛盾点                                                                          | 常见对策                                                                                                                                     | 参考材料                                                                                                                                                                                                                                                                                               |
| --: | ---------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | 显存不够用       | KV Cache 随序列长度近似线性增长；长上下文易导致显存不足或被迫降低并发               | 从结构上减少需保存的 KV（如 GQA/MQA，或 MLA 等压缩表示）；降低 KV 存储精度（如 FP8）；改进显存分配，避免为每条请求按最大长度预留整块连续空间 | [GQA](https://arxiv.org/abs/2305.13245)；[MQA](https://arxiv.org/abs/1911.02150)；[DeepSeek-V2 / MLA](https://arxiv.org/abs/2405.04434)；[vLLM PagedAttention 博文](https://vllm.ai/blog/2023-06-20-vllm)；[苏剑林：MHA→MLA](https://spaces.ac.cn/archives/10091)                                      |
|   2 | 越解码越慢       | 每一步解码都需读取历史 KV；历史越长，显存带宽压力越大；主要影响后续 token 延迟      | 减少每步加载的 KV 体积（GQA/MQA）；使用高效的注意力计算核；在超长流式场景中限制每次参与计算的历史范围（需权衡生成质量）                      | [GQA](https://arxiv.org/abs/2305.13245)；[HF Continuous batching](https://huggingface.co/blog/continuous_batching)；[StreamingLLM](https://arxiv.org/abs/2309.17453)；选读 [Pope 等](https://arxiv.org/abs/2211.05102)                                                                                 |
|   3 | 显存浪费、碎片多 | 多请求长短不一；按最大长度预留连续空间会造成空闲显存无法共享，并产生碎片            | 采用分页式 KV 管理（PagedAttention）：按固定大小的块按需分配，多条请求共享同一块池                                                           | [vLLM PagedAttention 博文](https://vllm.ai/blog/2023-06-20-vllm)；[PagedAttention 论文](https://arxiv.org/abs/2309.06180)；[TRT-LLM KV Cache](https://nvidia.github.io/TensorRT-LLM/features/kvcache.html)                                                                                             |
|   4 | 动态请求难调度   | 连续批处理下，短长请求交错，预填充与解码交错；固定形状批处理易产生大量无效填充      | 使用连续批处理与变长批（以掩码处理不同长度）；对过长 prompt 做分段预填充；与分页 KV 配合，并为解码预留必要显存余量                           | [HF Continuous batching](https://huggingface.co/blog/continuous_batching)；[Orca](https://www.usenix.org/conference/osdi22/presentation/yu)；[PagedAttention 论文](https://arxiv.org/abs/2309.06180)                                                                                                   |
|   5 | 前缀复用命中低   | 共享系统提示或多轮前缀时，若不能复用 KV，则每次完整预填充；命中通常要求前缀足够一致 | 启用前缀/提示/上下文缓存，按块自动复用；采用最长前缀匹配（如 RadixAttention）；保持系统提示稳定，易变内容放在共享前缀之后                    | [LMSYS RadixAttention / SGLang](https://www.lmsys.org/blog/2024-01-17-sglang/)；[SGLang 论文](https://arxiv.org/abs/2312.07104)；[vLLM APC](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/)；[TRT-LLM KV reuse](https://nvidia.github.io/TensorRT-LLM/advanced/kv-cache-reuse.html) |
|   6 | 淘汰会伤效果     | KV 池满时必须删除部分缓存；删错可能降低生成质量，或破坏本可复用的前缀               | 按优先级或最近最少使用等策略淘汰；适场景下保留少量起始位置并配合最近窗口（如 StreamingLLM）；必要时先将块转移至主机内存再删除                | [StreamingLLM](https://arxiv.org/abs/2309.17453)；[LMSYS RadixAttention](https://www.lmsys.org/blog/2024-01-17-sglang/)；[TRT-LLM KV Cache](https://nvidia.github.io/TensorRT-LLM/features/kvcache.html)                                                                                               |

我们将第 3 节中提到的挑战进一步可拆分成如上表格的 6 个关键问题。笔者不会一一展开，而是会重点介绍一下表格中的一些关键名词，包括 `MLA`、`GQA`、`MQA`、`PagedAttention` 和 `RadixAttention`。相信在了解完这些名词后再回过头来再阅读上方表格的时候，你就会豁然开朗了~

当然，除此之外，还有其他一些更深入的话题，笔者也让 AI 进行了简单梳理，感兴趣的读者可自行阅读下方表格中的参考资料。

```garden html
title: 问答
---
<div class="g-faq" role="group" aria-label="问答"><details><summary>7. 量化有损效果</summary><div><ul>
<li><strong>核心矛盾点</strong>：降低 KV 精度可减小体积、提高可服务长度或并发，但可能损失精度；不同层与任务敏感度不同</li>
<li><strong>常见对策</strong>：生产优先 FP8 等较稳妥方案并做校准；敏感层可跳过；更低比特需充分评测；可与 GQA/MLA 等结构手段叠加</li>
<li><strong>参考材料</strong>：<a href="https://docs.vllm.ai/en/latest/features/quantization/quantized_kvcache/">vLLM Quantized KV Cache</a>；<a href="https://nvidia.github.io/TensorRT-LLM/features/quantization.html">TRT-LLM Quantization</a>；选读 <a href="https://arxiv.org/abs/2402.02750">KIVI</a></li>
</ul>
</div></details><details><summary>8. 多卡切分易浪费</summary><div><ul>
<li><strong>核心矛盾点</strong>：多 GPU 并行时 KV 切分不当会导致近乎整份复制，显存与带宽收益下降；需与 KV 头数、并行度匹配</li>
<li><strong>常见对策</strong>：用 GQA 等匹配并行度；避免不当并行度下的极端 MQA 复制；按框架组合 TP/PP/上下文并行</li>
<li><strong>参考材料</strong>：<a href="https://arxiv.org/abs/2305.13245">GQA</a>；<a href="https://arxiv.org/abs/2211.05102">Pope 等</a>；<a href="https://nvidia.github.io/TensorRT-LLM/features/kvcache.html">TRT-LLM KV Cache</a></li>
</ul>
</div></details><details><summary>9. 分阶段后要搬 KV</summary><div><ul>
<li><strong>核心矛盾点</strong>：预填充与解码同池易互相干扰；拆机后须传输 KV，网络可能成为新瓶颈</li>
<li><strong>常见对策</strong>：预填充/解码分池；层间或分段异步传输以重叠计算与通信；KV 中心调度或缓存池</li>
<li><strong>参考材料</strong>：<a href="https://arxiv.org/abs/2401.09670">DistServe</a>；<a href="https://arxiv.org/abs/2407.00079">Mooncake</a>；选读 <a href="https://arxiv.org/abs/2311.18677">Splitwise</a></li>
</ul>
</div></details><details><summary>10. 外存卸载反而更慢</summary><div><ul>
<li><strong>核心矛盾点</strong>：卸到 CPU/磁盘可腾显存，但带宽远低于 GPU 显存；作热路径时延迟往往变差</li>
<li><strong>常见对策</strong>：仅作溢出或延长复用，不作每步热路径；异步拷贝；区分单机换出与跨请求前缀池</li>
<li><strong>参考材料</strong>：<a href="https://nvidia.github.io/TensorRT-LLM/advanced/kv-cache-reuse.html">TRT-LLM host offload / reuse</a>；<a href="https://arxiv.org/abs/2303.06865">FlexGen</a>；<a href="https://arxiv.org/abs/2407.00079">Mooncake</a></li>
</ul>
</div></details><details><summary>11. 分支生成难共享</summary><div><ul>
<li><strong>核心矛盾点</strong>：束搜索/并行采样/投机解码需共享 prompt KV；写入分叉不能污染共享态，拒绝后须可回滚</li>
<li><strong>常见对策</strong>：块级引用计数与写时复制；拒绝草稿后回滚块表/长度等元数据</li>
<li><strong>参考材料</strong>：<a href="https://vllm.ai/blog/2023-06-20-vllm">vLLM PagedAttention 博文</a>；<a href="https://arxiv.org/abs/2309.06180">PagedAttention 论文</a>；<a href="https://nvidia.github.io/TensorRT-LLM/features/kvcache.html">TRT-LLM KV Cache</a></li>
</ul>
</div></details><details><summary>12. 多适配器不能盲共用</summary><div><ul>
<li><strong>核心矛盾点</strong>：多 LoRA 等适配器并存时计算路径不同；KV/前缀缓存未隔离易引发正确性问题</li>
<li><strong>常见对策</strong>：缓存键纳入适配器身份并隔离复用；统一分页管理权重与 KV，禁止跨适配器无条件共享</li>
<li><strong>参考材料</strong>：<a href="https://arxiv.org/abs/2311.03285">S-LoRA</a>；<a href="https://docs.vllm.ai/en/latest/design/prefix_caching/">vLLM 前缀缓存设计</a>；<a href="https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/">vLLM APC 功能页</a></li>
</ul>
</div></details></div>
```

### 4.1 少存一点：MHA/MQA/GQA/MLA

```garden html
title: 四种注意力结构
---
<div class="g-tabs" data-g="tabs"><div role="tablist" aria-label="四种注意力结构"><button type="button" role="tab" id="tb1-t0" aria-controls="tb1-p0" aria-selected="true" tabindex="0">MHA</button><button type="button" role="tab" id="tb1-t1" aria-controls="tb1-p1" aria-selected="false" tabindex="-1">MQA</button><button type="button" role="tab" id="tb1-t2" aria-controls="tb1-p2" aria-selected="false" tabindex="-1">GQA</button></div><div role="tabpanel" id="tb1-p0" aria-labelledby="tb1-t0" tabindex="0"><p>**MHA（Multi-Head Attention）**是 Transformer 最基础的多头注意力机制。其核心是：在同一注意力层内，每个 Query 头都配有一组独立的 Key 与 Value。若有 32 个 Query 头，则对每个 token、在该层需要保存 32 个 K 与 32 个 V。层数越多、序列越长，需要保存的 K/V 总量也越大，因此 MHA 下的 KV Cache 往往会占用较多显存。</p>
<p><img src="https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2018,%202026,%2002_26_16%20PM%20%281%29.png" alt=""></p>
</div><div role="tabpanel" id="tb1-p1" aria-labelledby="tb1-t1" tabindex="0" hidden><p>后来大家发现：Query 需要很多 head 才能表达不同关注方向，但 K/V 不一定需要每个 Query 都独占一套。</p>
<p>所以就推出了 <strong>MQA（Multi-Query Attention）</strong>，<mark class="hl">Q 还是独享的，但是所有 Head 共享一套 K/V</mark>，所以理论上占用的显存大小直接缩小到原来的 <span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mfrac><mn>1</mn><mrow><mi>h</mi><mi>e</mi><mi>a</mi><mi>d</mi><mi mathvariant="normal"><em></mi><mi>n</mi><mi>u</mi><mi>m</mi></mrow></mfrac></mrow><annotation encoding="application/x-tex">\frac{1}{head_num}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1.4071em;vertical-align:-0.562em;"></span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:0.8451em;"><span style="top:-2.655em;"><span class="pstrut" style="height:3em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight">h</span><span class="mord mathnormal mtight">e</span><span class="mord mathnormal mtight">a</span><span class="mord mathnormal mtight">d</span><span class="mord mtight" style="margin-right:0.0278em;"></em></span><span class="mord mathnormal mtight">n</span><span class="mord mathnormal mtight">u</span><span class="mord mathnormal mtight">m</span></span></span></span><span style="top:-3.23em;"><span class="pstrut" style="height:3em;"></span><span class="frac-line" style="border-bottom-width:0.04em;"></span></span><span style="top:-3.394em;"><span class="pstrut" style="height:3em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mtight">1</span></span></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.562em;"><span></span></span></span></span></span><span class="mclose nulldelimiter"></span></span></span></span></span>。</p>
<p><img src="https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2018,%202026,%2002_26_17%20PM%20%282%29.png" alt=""></p>
</div><div role="tabpanel" id="tb1-p2" aria-labelledby="tb1-t2" tabindex="0" hidden><p>但是 MQA 又太激进了，所有 Q 都共用一套 K/V，模型能力可能受到影响，所以就出现了中间方案 <strong>GQA（Grouped-Query Attention）</strong>。它的核心是<mark class="hl">将 Head 进行分组，组内共用一套 K/V，组间进行隔离</mark>。理论上占用的显存大小直接缩小到原来的 <span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mfrac><mrow><mi>g</mi><mi>r</mi><mi>o</mi><mi>u</mi><mi>p</mi><mi mathvariant="normal"><em></mi><mi>n</mi><mi>u</mi><mi>m</mi></mrow><mrow><mi>h</mi><mi>e</mi><mi>a</mi><mi>d</mi><mi mathvariant="normal"></em></mi><mi>n</mi><mi>u</mi><mi>m</mi></mrow></mfrac></mrow><annotation encoding="application/x-tex">\frac{group_num}{head_num}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1.3904em;vertical-align:-0.562em;"></span><span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac"><span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:0.8284em;"><span style="top:-2.655em;"><span class="pstrut" style="height:3em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight">h</span><span class="mord mathnormal mtight">e</span><span class="mord mathnormal mtight">a</span><span class="mord mathnormal mtight">d</span><span class="mord mtight" style="margin-right:0.0278em;"><em></span><span class="mord mathnormal mtight">n</span><span class="mord mathnormal mtight">u</span><span class="mord mathnormal mtight">m</span></span></span></span><span style="top:-3.23em;"><span class="pstrut" style="height:3em;"></span><span class="frac-line" style="border-bottom-width:0.04em;"></span></span><span style="top:-3.527em;"><span class="pstrut" style="height:3em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight"><span class="mord mathnormal mtight" style="margin-right:0.0359em;">g</span><span class="mord mathnormal mtight" style="margin-right:0.0278em;">r</span><span class="mord mathnormal mtight">o</span><span class="mord mathnormal mtight">u</span><span class="mord mathnormal mtight">p</span><span class="mord mtight" style="margin-right:0.0278em;"></em></span><span class="mord mathnormal mtight">n</span><span class="mord mathnormal mtight">u</span><span class="mord mathnormal mtight">m</span></span></span></span></span><span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.562em;"><span></span></span></span></span></span><span class="mclose nulldelimiter"></span></span></span></span></span>。GQA 本质上是一种在模型能力和显存消耗之间的 trade-off，大多数 LLM 都会采用 GQA，因为它在模型能力和 KV Cache 之间取得了一个非常好的折中。</p>
<p><img src="https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2018,%202026,%2002_26_18%20PM%20%283%29.png" alt=""></p>
</div></div>
```

```garden compare
- { title: MHA, K/V: 每个 Query 头都配有一组独立的 K 与 V, KV Cache: 基准 }
- { title: MQA, K/V: 所有 Head 共享一套 K/V, KV Cache: 理论上 1 / head_num, 代价: 模型能力可能受到影响 }
- { title: GQA, K/V: 组内共用一套 K/V，组间隔离, KV Cache: 理论上 group_num / head_num, 代价: 能力与显存的 trade-off }
- { title: MLA, K/V: 只缓存压缩后的 latent, KV Cache: low-rank key-value joint compression }
```

```garden html
title: 读懂了吗
---
<form class="g-quiz" data-g="quiz" data-answer="0"><fieldset><legend><span class="g-quiz-tag">读懂了吗</span>MQA 理论上把 KV Cache 缩小到原来的多少？</legend><label><input type="radio" name="qz4" value="0"> 1 / head_num</label><label><input type="radio" name="qz4" value="1"> group_num / head_num</label><label><input type="radio" name="qz4" value="2"> 不变，只是更快</label></fieldset><div class="g-quiz-row"><button type="submit">核对答案</button><p class="g-quiz-out" role="status" aria-live="polite"></p></div><div class="g-quiz-ex" hidden><p></p></div></form>
```

### 4.2 分页管理：PagedAttention

前面我们探讨 KV Cache 最大的一个问题就是占据内存很大，且随着 token 变长，KV Cache 就需要更大的空间。前面的 MQA/GQA/MLA 都是尝试在存少一点的方向上努力。

现在我们需要来思考，怎么给每一个请求分配相应的 KV Cache 显存空间呢？早期的做法是按最大长度给每条序列预留一块连续显存。这导致了 3 个问题：

```garden compare
- { title: 内部碎片, 为什么: 预先分配连续物理显存（如 2048 或 4096 tokens）, 后果: 多出来的空间白白占着 }
- { title: 外部碎片, 为什么: 物理上连续分配，空闲空隙大小不一, 后果: 总量够也分配不了 }
- { title: 重复开销, 为什么: 并行采样/多轮对话共享前缀, 后果: 每个分支全量复制一份 }
```

显存装不下更多并发，batch 就上不去，GPU 算力吃不满，这时候瓶颈就不在计算了，而是在**内存管理**。

熟悉计算机原理的读者肯定能联想到操作系统本身的内存管理也面临着一样的问题。是的，PagedAttention 的解决方案就是借鉴操作系统的虚拟内存分页。

PagedAttention 出自 **vLLM 团队**，它将操作系统中的**虚拟内存与分页（Paging）机制**引入了注意力机制中。具体可以看以下材料：

<!-- 单独成行的链接自动变成卡片 -->
https://arxiv.org/abs/2309.06180

https://vllm.ai/blog/2023-06-20-vllm

<!-- 原文：
- 论文：[Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)
- 博文：[vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention](https://vllm.ai/blog/2023-06-20-vllm)
-->

PagedAttention 的核心原理如下图所示：

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2018,%202026,%2002_23_07%20PM%20%281%29.png)

具体来说：

```garden html
title: 步骤
---
<ol class="g-steps"><li><p class="g-step-t">切分物理块（Blocks / Pages）</p><p>将原本连续的 KV Cache 切分成固定大小的物理块（例如每个 block 包含 16 个 token 的 KV 数据）。</p>
</li><li><p class="g-step-t">非连续物理存储</p><p>一个序列的 KV Cache 不再需要存放在连续的显存空间中，可以离散分布在显存各处。</p>
</li><li><p class="g-step-t">逻辑块映射（Block Table）</p><p>类似操作系统的页表，维护逻辑 block 到物理 block 的映射关系。模型计算注意力时，通过 Block Table 按需动态查找物理地址。</p>
</li><li><p class="g-step-t">按需分配（On-demand Allocation）</p><p>仅在当前 block 写满并生成第 17 个 token 时，才申请分配下一个新的物理 block。内部碎片被严格限制在每个序列最后一个 block 的残余空间内。</p>
</li><li><p class="g-step-t">写时复制（Copy-on-Write）</p><p>对于共享相同 prompt 的并行分支或多轮对话，多个逻辑 block 可以直接指向同一个只读物理 block。仅在某个分支开始写入新 token 时才复制并新建物理块，极大减少显存冗余。</p>
</li></ol>
```

动手试试按需分配：

```garden html
title: PagedAttention 分页分配演示
---
<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<style>:root{--ink:#1B1A18;--soft:#4A4844;--muted:#6E6B64;--rule:#E6E3DC;--rule-strong:#D6D2C9;--card:#fff;--blue:#2C55B4;--blue-tint:#EAF0FC;--blue-line:rgba(44,85,180,.28);--paper:#F8F7F3;--well:#F0EEE8}
#r{display:flow-root;padding:16px}body{margin:0;font:15px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",sans-serif;color:var(--ink);background:transparent}
button{font:600 14px/1 inherit;font-family:inherit;padding:10px 14px;min-height:40px;border-radius:8px;border:1px solid var(--rule-strong);background:var(--card);color:var(--ink);cursor:pointer}
button:hover{border-color:var(--blue-line)}button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}button:disabled{opacity:.45;cursor:default}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.cap{font-size:13px;color:var(--muted);margin:10px 0 0}
</style><script>function size(){var r=document.getElementById('r');if(r)parent.postMessage({type:'garden:resize',height:Math.ceil(r.getBoundingClientRect().bottom)+4},'*')}</script><main id="r"><style>
.pool{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-top:8px}
.b{border:1px solid var(--rule);border-radius:8px;padding:6px;min-height:48px;font-size:12px;color:var(--muted);position:relative}
.b .id{font:600 11px ui-monospace,Menlo,monospace}.b .f{height:6px;border-radius:3px;background:var(--well);margin-top:6px;overflow:hidden}.b .f i{display:block;height:100%}
.b.A{border-color:#6B8FD8}.b.A .f i{background:#2C55B4}.b.B{border-color:#C9A15A}.b.B .f i{background:#8A5300}
.b .w{font-size:11px;margin-top:4px;color:var(--ink)}
h4{margin:14px 0 4px;font-size:14px}.tbl{font:13px/1.7 ui-monospace,Menlo,monospace;color:var(--soft)}
.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.k{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:0}
@media (max-width:460px){.pool{grid-template-columns:repeat(4,minmax(0,1fr))}.row{grid-template-columns:1fr}}
</style>
<div class="row"><div><h4><span class="k" style="background:#2C55B4"></span>请求 A 的 Block Table</h4><div class="tbl" id="tA"></div></div><div><h4><span class="k" style="background:#8A5300"></span>请求 B 的 Block Table</h4><div class="tbl" id="tB"></div></div></div>
<h4>物理块池（每块 16 个 token）</h4><div class="pool" id="pool"></div>
<p class="cap" id="msg" aria-live="polite"></p>
<div class="bar"><button type="button" data-r="A" data-n="1">A 生成 1 个 token</button><button type="button" data-r="B" data-n="1">B 生成 1 个 token</button><button type="button" data-r="A" data-n="16">A 生成 16 个</button><button type="button" id="fin">A 结束，释放</button><button type="button" id="reset">重来</button></div>
<p class="cap">示例：块大小 16 来自原文；块池大小、两个请求的初始长度（A 15、B 7 个 token）和分配顺序是演示用的假设。</p>
<script>
var BS=16,N=12,ORDER=[7,2,10,4,0,9,5,11,1,8,3,6],st;
function init(){st={free:ORDER.slice(),A:{len:0,blocks:[],done:false},B:{len:0,blocks:[]}};grow('A',15,1);grow('B',7,1);say('起始：A 已有 15 个 token，B 已有 7 个，各占 1 个物理块。')}
function grow(r,n,q){var s=st[r];if(s.done)return say('A 已结束。');for(var k=0;k<n;k++){if(s.len%BS===0){if(!st.free.length){say('块池已满，需要等待或淘汰。');break}var p=st.free.shift();s.blocks.push(p);if(!q)say(r+' 写到第 '+(s.len+1)+' 个 token：当前块已满，按需分配物理块 #'+p+'（不必和前一块相邻）。')}s.len++}
if(!q&&s.len%BS!==1)say(r+' 现在 '+s.len+' 个 token，写进已有的块，无需新分配。')}
function say(m){document.getElementById('msg').textContent=m}
function draw(){var own={};['A','B'].forEach(function(r){st[r].blocks.forEach(function(p,i){var used=Math.min(BS,st[r].len-i*BS);own[p]=[r,used]})});
document.getElementById('pool').innerHTML=Array.from({length:N},function(_,p){var o=own[p];return '<div class="b '+(o?o[0]:'')+'"><span class="id">#'+p+'</span>'+(o?'<div class="w">'+o[0]+' · '+o[1]+'/16</div><div class="f"><i style="width:'+(o[1]/BS*100)+'%"></i></div>':'<div class="w" style="color:var(--muted)">空闲</div>')+'</div>'}).join('');
['A','B'].forEach(function(r){var s=st[r];document.getElementById('t'+r).innerHTML=s.done?'已释放':s.blocks.map(function(p,i){return '逻辑 '+i+' → 物理 #'+p}).join('<br>')+'<br><span style="color:var(--muted)">共 '+s.len+' token，末块空 '+((BS-s.len%BS)%BS)+' 槽</span>'});size()}
document.querySelectorAll('[data-r]').forEach(function(b){b.onclick=function(){grow(b.dataset.r,+b.dataset.n);draw()}});
document.getElementById('fin').onclick=function(){var s=st.A;if(s.done)return;st.free=st.free.concat(s.blocks);s.done=true;s.blocks=[];say('A 结束：它的物理块回到池里，B 和新请求都能用。');draw()};
document.getElementById('reset').onclick=function(){init();draw()};init();draw();
</script></main><script>
addEventListener('message',function(e){if(e.source!==parent||!e.data||e.data.type!=='garden:theme')return;if(e.data.scheme==='dark'||e.data.scheme==='light')document.documentElement.style.colorScheme=e.data.scheme;var t=e.data.tokens||{};for(var k in t)if(/^--[a-z-]+$/.test(k)&&/^[#\w(),.% -]+$/.test(t[k]))document.documentElement.style.setProperty(k,t[k])});
addEventListener('resize',size);
</script>
```

### 4.3 前缀匹配：RadixAttention

前文我们提到，PagedAttention 已经具备了写时复制（CoW）的能力了，它好像已经可以实现前缀复用了，那为什么还需要 RadixAttention 呢？

主要是在处理复杂的前缀共享时，PagedAttention 还存在几个关键局限：

- **生命周期局限**：PagedAttention 的 Block Table 通常绑定在**单次请求生命周期**内。当一个请求生成完毕（或者一次并行采样结束），其对应的物理 Block 默认就被系统释放回收了。如果用户在多轮对话中发来下一句，或者不同用户请求了包含相同 System Prompt / Few-shot 示例的内容，传统的 PagedAttention 很难自动感知这部分 KV 刚才算过，还在显存里，通常需要重新 Prefill。
- **缺少高效的前缀检索和匹配机制**：PagedAttention 解决了内存怎么切块存放，但没有提供高效查找一段 Token 序列是否已有缓存的索引机制。所以当面对多分支探索、Agent 工具调用树、Few-shot 模板等复杂模式时，如何快速判断一个新请求匹配了历史哪个缓存片段，PagedAttention 并没有统一的树状结构来索引。
- **缺乏显存满载时的缓存驱逐策略**：在操作系统里，分页机制必须配合置换算法（如 LRU）才能真正实现持久缓存。PagedAttention 本身缺少一套根据显存压力动态换出/淘汰旧 KV Cache 的自适应策略。

```garden compare
- { title: PagedAttention, 生命周期: 绑定单次请求, 前缀检索: 没有统一的树状索引, 显存满载: 缺少自适应淘汰 }
- { title: RadixAttention, 生命周期: 跨请求/跨会话留在树中, 前缀检索: 基数树最长公共前缀匹配, 显存满载: 树节点 LRU 动态驱逐 }
```

RadixAttention 将 KV Cache 的管理从单纯的页表映射升级为**以 Token 前缀为键的基数树（Radix Tree / 压缩前缀树）**，将 KV Cache 变成了**全局持久化、动态维护的 LRU 缓存池**。

RadixAttention 出自 **SGLang 团队**，具体可以看以下材料：

<!-- 卡片 -->
https://arxiv.org/abs/2312.07104

https://www.lmsys.org/blog/2024-01-17-sglang/

<!-- 原文：
- 论文：[SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104)
- 博文：[Fast and Expressive LLM Inference with RadixAttention and SGLang](https://www.lmsys.org/blog/2024-01-17-sglang/)
-->

RadixAttention 的原理如下图所示：

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/ChatGPT%20Image%20Sep%2018,%202026,%2002_23_08%20PM%20%282%29.png)

具体来说：

```garden html
title: 步骤
---
<ol class="g-steps"><li><p class="g-step-t">树状前缀索引与最长公共前缀匹配（LCP Match）</p><p>每个节点存储一段连续的 token 序列及其对应的物理 KV 缓存块。新请求到来时，直接在基数树中进行前缀匹配，跳过已缓存部分，仅对未命中的后缀进行 Prefill。</p>
</li><li><p class="g-step-t">跨请求/跨会话的天然共享（Cross-Request Sharing）</p><p>请求处理完毕后，KV Cache <strong>不被销毁</strong>，而是继续留在树中。即使是来自完全不同客户端的独立请求，只要命中了相同的 System Prompt、RAG 上下文或代码工程前缀，就能直接复用。</p>
</li><li><p class="g-step-t">基于树节点的 LRU 动态驱逐（Dynamic Eviction）</p><p>显存不足时，系统按照 LRU（最近最少使用）策略递归裁剪叶子节点及其占用的物理 Block，腾出显存给新请求；活跃前缀则常驻显存。</p>
</li><li><p class="g-step-t">完美支持复杂结构化工作流</p><p>面对 Agent 规划多分支推理、多轮工具调用、并行生成对比等非线性交互，基数树天然地将分支转化为树的分叉，分支回退或探索不同分支时不需要任何显式的数据拷贝。</p>
</li></ol>
```

```garden html
title: 读懂了吗
---
<form class="g-quiz" data-g="quiz" data-answer="1"><fieldset><legend><span class="g-quiz-tag">读懂了吗</span>PagedAttention 已经有写时复制，为什么还需要 RadixAttention？</legend><label><input type="radio" name="qz5" value="0"> 因为 PagedAttention 不能分块存储</label><label><input type="radio" name="qz5" value="1"> 因为 Block Table 通常绑定在单次请求内，也缺少前缀索引和满载时的驱逐策略</label><label><input type="radio" name="qz5" value="2"> 因为 RadixAttention 让 Attention 变成了 O(1)</label></fieldset><div class="g-quiz-row"><button type="submit">核对答案</button><p class="g-quiz-out" role="status" aria-live="polite"></p></div><div class="g-quiz-ex" hidden><p></p></div></form>
```

## 5. 如何应用好 KV Cache？

一般来说，在应用层层面，我们是无需关注 KV Cache 的，这是由模型提供商的推理服务负责的，他们会负责好关于 KV Cache 的一切工作。我们需要关心的是基于 KV Cache 原理的 Prefix Cache，即前缀匹配。

核心就是一句话：

> [!IMPORTANT]
>
> 在组织 Prompt 的时候，尽可能保证稳定前缀在前，易变内容在后。

示例（不是原文）：

```python
  messages = [
-   {"role": "system", "content": f"当前时间：{now}\n" + SYSTEM_PROMPT},
+   {"role": "system", "content": SYSTEM_PROMPT},              # 稳定前缀在前
    *history,
+   {"role": "user", "content": f"当前时间：{now}\n" + question},  # 易变内容在后
  ]
```

更具体的策略，笔者在另外一篇博文 [Prompt Engineering 从提示词撰写到生产治理](/blog/ai-agent/ai-agent-prompt-engineering/) 中有更详细的介绍，欢迎阅读~
