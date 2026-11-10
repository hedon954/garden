import fs from 'node:fs';
import path from 'node:path';
const engine = path.resolve(import.meta.dirname, '..');

export const punctuationFixtureSource = `---
title: Neutral inline punctuation fixture
date: 2026-01-01
summary: Neutral typography cases for closing punctuation after inline math.
tags: [test]
---

The sentences below are explicit test material, not a user article.

## Reported pattern

> **注意**：观察者看到了 $A$ 和 $B$，但无法反推出 $a$ 或 $b$，因此算不出 $S$。

## Body and punctuation

相邻普通文字里的逗号，以及句号。和公式 $S$，逗号、$K$；分号、$T$：冒号、$U$）。闭括号、$V$」。闭引号。

English also keeps $S$, $a$; $b$: and $T$.

## Long formula

前 $abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$。

## Formula without punctuation

前 $abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$

## Formula with break opportunities

前 $a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12}$

## Compose Markdown

\`\`\`garden compose
<figure frame="none"><markdown>验证公式 $S$，然后继续说明。</markdown></figure>
\`\`\`
`;

export function writePunctuationFixture(site) {
  fs.mkdirSync(path.join(site, 'content/posts'), { recursive: true });
  fs.writeFileSync(
    path.join(site, 'site.config.yaml'),
    fs.readFileSync(path.join(engine, 'templates/site/site.config.en.yaml'), 'utf8')
      .replace(/^name:.*$/m, 'name: Neutral punctuation regression'),
  );
  const post = path.join(site, 'content/posts/punctuation-fixture.md');
  fs.writeFileSync(post, punctuationFixtureSource);
  return post;
}
