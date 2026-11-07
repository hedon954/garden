# Minimal examples · 最小样例

## Static two-card composition / 两卡片

```garden compose
<intent>用两张卡片区分认证结果与资源访问能力。</intent>
<grid cols={2} gap={3}>
  <card padding={3} radius="lg" border="subtle" color="#17324d" backgroundColor="#eaf3ff">
    <title>ID Token</title>
    <text>证明用户的认证结果</text>
    <caption>Audience: Client / RP</caption>
  </card>
  <card padding={3} radius="lg" border="subtle" color="#17452c" backgroundColor="#eaf8ef">
    <title>Access Token</title>
    <text>代表获授予的资源访问能力</text>
    <caption>Audience: Resource Server</caption>
  </card>
</grid>
```

The example demonstrates native generic layout and custom colors, not a new compare-specific renderer or a claim about exact responsive pixel parity.

## Play / 可调参数

```garden compose #compose-seats
caption: 调席位，月费随公式变化。
intent: |
  读者调整席位数，查看按每席 24 USD 计算的月费。
---
{@body const [seats, setSeats] = DIL.useState(3)}
{@body const total = seats * 24}
<slider min={1} max={12} value={seats} onChange={setSeats} label="席位" />
<stat label="月费" value={total} unit="USD" />
```

For charts use current prompt/catalog and the engine handbook Compose chart examples. Play supports palette series/categorical, yStep, overflow expand/clip, legend auto/show/hide and legendPosition top/bottom; do not assume static diagram controls have live state.

## Rich article content / 富文本

完整 Markdown 和安全 HTML 用内容岛，不在行内 text 中模拟块结构。允许范围以 schema 的 content 字段为准；可执行演示用同入口的 sandbox。

```garden compose
<figure frame="none">
<markdown>
### Explicit test content

**Bold**, _emphasis_, `code`, [link](https://example.com), ~~strike~~ and <u>underline</u>.

- Full Markdown list
- Second item

<details><summary>Details</summary><p>Safe article HTML.</p></details>
</markdown>
</figure>
```
