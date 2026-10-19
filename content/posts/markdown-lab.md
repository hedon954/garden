---
title: Markdown 复杂语法实验场
description: 用一篇真实文章验证 Typora 常用语法、数学公式、Mermaid、脚注、表格与原生 HTML。
date: 2026-07-25
tags:
  - Markdown
  - Typora
  - Mermaid
  - KaTeX
pinned: false
readingTime: 10 分钟
references:
  - title: CommonMark Spec
    url: https://spec.commonmark.org/
  - title: GitHub Flavored Markdown Spec
    url: https://github.github.com/gfm/
  - title: Typora 支持的 Markdown 语法
    url: https://support.typora.io/Markdown-Reference/
  - title: KaTeX 支持的函数
    url: https://katex.org/docs/supported.html
  - title: Mermaid 文档
    url: https://mermaid.js.org/intro/
  - title: 《The Elements of Typographic Style》
cover: https://images.unsplash.com/photo-1761414500824-e280de5a1b37?auto=format&fit=crop&w=1600&q=84
---

这篇文章不是功能清单，而是一份可以长期保留的**渲染验收样本**。我会在 Typora 中常用的语法和网页输出之间建立一条可重复验证的路径。

> 写作格式的价值，不在于语法多，而在于文件离开编辑器之后仍能完整表达。

## 基础排版与 GFM

实现**掩码（Masking）**操作，引入**多头注意力（Multi-Head Attention）**机制；前**（中文括号）**后也能正常加粗。

<u>新的向量知道前面有 `Your journey`，后面有 `with one step`，高亮应连续。</u>

一段文字可以同时包含**粗体**、*斜体*、~~删除线~~、`inline code` 和 [外部链接](https://typora.io/)。

- 第一层列表
  - 第二层列表
    - 第三层列表
- 列表之后仍然保持稳定的段落节奏

1. 写作
2. 本地预览
3. 发布与验证

- [x] 标题、引用、列表和代码
- [x] 表格、删除线与任务列表
- [x] 数学公式与 Mermaid
- [ ] 用新的真实文章继续回归测试

| 能力 | 写法 | 网页表现 |
| --- | :---: | ---: |
| GFM | `remark-gfm` | 已验证 |
| 数学公式 | `$...$` / `$$...$$` | KaTeX |
| 图表 | Mermaid fenced code | SVG |

## 语义警告框

> [!NOTE]
> 普通补充信息会显示为「提醒」。

> [!TIP]
> 推荐做法会显示为「建议」。

> [!IMPORTANT]
> 读者不能漏掉的要点会显示为「重要」。

> [!WARNING]
> 需要关注的风险会显示为「警告」。

> [!CAUTION]
> 可能造成严重后果的操作会显示为「注意」。

## 链接卡片

在链接后面紧跟 `{card}`，网页里会多出一张卡片，写着对方页面的标题、简介和配图。链接写在句子里时，文字照常可点，卡片跟在这一段后面：表格、任务列表和脚注都来自 [remark-gfm](https://github.com/remarkjs/remark-gfm){card}，它让 GFM 语法在这里生效。

链接单独占一行时，卡片就放在这一行的位置：

[KaTeX 支持的函数](https://katex.org/docs/supported.html){card}

写在代码里的 `[文字](https://example.com){card}` 不会变成卡片，原样显示。

### 标题里的 [Typora](https://typora.io/) 外链

标题本身点了会定位到这里，不带下划线；标题里的外链照常带虚线下划线。

## 数学公式

**求和部分：$\sum_{j=1}^{N}$（上下限）**。

$$
C_i = \sum_{j=1}^N w_{ij} \cdot V_j
$$

行内公式会和文字一起流动，例如注意力的缩放项 $\frac{QK^\top}{\sqrt{d_k}}$。

块级公式支持多行对齐：

$$
\begin{aligned}
\operatorname{Attention}(Q,K,V)
  &= \operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V \\
K_{\text{cache}}^{(t)}
  &= [K_{\text{cache}}^{(t-1)}; K_t] \\
V_{\text{cache}}^{(t)}
  &= [V_{\text{cache}}^{(t-1)}; V_t]
\end{aligned}
$$

矩阵也能正常显示：

$$
X =
\begin{bmatrix}
1 & 0 & 1 \\
0 & 1 & 0 \\
1 & 1 & 1
\end{bmatrix}
$$

## Mermaid 流程与时序

所有 Mermaid 图表固定使用「中性」主题。每张图都可以在「图表」与「Code」之间切换：前者用于阅读，后者用于检查或复制原始 Mermaid 语法。

下面的流程图描述本地写作到发布的闭环：

```mermaid
flowchart LR
  A[Typora 写作] --> B{本地验证}
  B -->|通过| C[生成内容索引]
  B -->|失败| A
  C --> D[构建网站]
  D --> E[浏览器验收]
  E --> F[发布]
```

同一篇文章里可以继续放更复杂的时序图：

```mermaid
sequenceDiagram
  autonumber
  participant W as Writer
  participant M as Markdown
  participant S as Site
  participant R as Reader
  W->>M: 保存 .md 与媒体
  M->>S: 构建内容与目录
  S-->>W: 返回预览
  W->>S: 发布已验证版本
  R->>S: 阅读文章
  S-->>R: HTML + KaTeX + Mermaid
```

## 多语言代码高亮

同一种内容结构，在不同语言里应该保留各自可辨识的关键字、类型、字符串、注释与数字层级。

### TypeScript

```typescript
type Post<TMeta extends Record<string, unknown>> = {
  slug: string;
  meta: TMeta;
};

async function publish<TMeta extends Record<string, unknown>>(
  post: Post<TMeta>,
): Promise<string> {
  const response = await fetch(`/api/posts/${post.slug}`, {
    method: "POST",
    body: JSON.stringify(post.meta),
  });
  return response.ok ? "published" : "failed";
}
```

### Python

```python
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class Article:
    """选中这行文字时，深浅主题都应保持清晰。"""
    title: str
    source: Path

def published_titles(articles: list[Article]) -> list[str]:
    return [article.title for article in articles if article.source.exists()]
```

### Rust

```rust
#[derive(Debug)]
struct Entry<'a> {
    title: &'a str,
    pinned: bool,
}

fn pinned_titles(entries: &[Entry<'_>]) -> Vec<&str> {
    entries.iter()
        .filter(|entry| entry.pinned)
        .map(|entry| entry.title)
        .collect()
}
```

### Go

```go
func renderAll(ctx context.Context, slugs []string) <-chan Result {
	results := make(chan Result)
	go func() {
		defer close(results)
		for _, slug := range slugs {
			results <- render(ctx, slug)
		}
	}()
	return results
}
```

### SQL

```sql
WITH ranked_posts AS (
  SELECT
    title,
    topic,
    ROW_NUMBER() OVER (PARTITION BY topic ORDER BY published_at DESC) AS rank
  FROM posts
  WHERE status = 'published'
)
SELECT title, topic
FROM ranked_posts
WHERE rank <= 3;
```

### Swift

```swift
actor ReadingProgress {
    private var offsets: [URL: Double] = [:]

    func save(_ offset: Double, for article: URL) {
        offsets[article] = max(0, offset)
    }

    func restore(for article: URL) -> Double {
        offsets[article, default: 0]
    }
}
```

### C#

```c#
public record Article(string Title, DateOnly Published);

public static class Archive
{
    public static IEnumerable<string> Titles(IEnumerable<Article> articles) =>
        articles.OrderByDescending(a => a.Published).Select(a => a.Title);
}
```

### C++

```c++
#include <string>
#include <vector>

struct Article {
    std::string title;
    int words;
};

int totalWords(const std::vector<Article>& articles) {
    int total = 0;
    for (const auto& article : articles) total += article.words;
    return total;
}
```

### Shell

```sh
npx garden check && npm run build
```

```bash
for file in content/posts/*.md; do
  wc -m "$file"
done
```

## Diff、图片与原生 HTML

```diff
- const publishing = "copy and paste";
+ const publishing = "content as source";
```

![木桌上的笔记本与钢笔](https://images.unsplash.com/photo-1501525771695-688643efeea4?auto=format&fit=crop&w=1400&q=82)

<details>
  <summary>展开原生 HTML 内容</summary>
  <p>Typora 文件中的 details / summary 会保留为可交互的折叠区域。</p>
</details>

```garden html
code: |
  <p class="garden-html-probe">静态 HTML 块</p>
```

```garden compare
items:
  - "**程序化**：结构化、强状态、可以穷举的场景。"
  - "大模型: 非结构化、需要理解语境的场景。"
```

---

最后用一个脚注说明这篇文章的角色：它既是示例，也是未来升级 Markdown 依赖时的回归测试。[^regression]

[^regression]: 页面构建测试会检查公式与示例内容，浏览器验收会检查 Mermaid 是否被转换为 SVG。
