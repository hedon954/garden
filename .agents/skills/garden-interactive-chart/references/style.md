# Garden 图表视觉

跟站点 `app/globals.css` 的 token，不要跟参考文的暗色绿光走。

## Token

```css
:root {
  --paper: #f8f8f6;
  --paper-deep: #eeeeeb;
  --card: #ffffff;
  --ink: #202124;
  --ink-soft: #34383d;
  --muted: #65707d;
  --faint: #a1a6ad;
  --line: #deded9;
  --line-strong: #c9c9c2;
  --accent: #d82d48;
  --accent-soft: #f9e8eb;
  --new: #1f7a4d;
  --new-soft: #e5f4ec;
}

:root[data-theme="dark"] {
  --paper: #171819;
  --paper-deep: #202224;
  --card: #1e2022;
  --ink: #ededeb;
  --ink-soft: #d8d8d4;
  --muted: #a6adb6;
  --faint: #747b84;
  --line: #35383b;
  --line-strong: #4b4f54;
  --accent: #ff5d76;
  --accent-soft: #3b242a;
  --new: #5ee0a0;
  --new-soft: #1a3a2c;
}
```

强调色最多用在 1–2 个焦点上。新算用 `--new`，浪费/重复用 `--accent`，缓存用 `--muted`。

## 字体与密度

```css
font-family: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
font-size: 13px;
line-height: 1.5;
```

不要引入 Google Fonts。正文栏大约 700px，按 640–680 画。控件高度、间距用 4 的倍数。不要阴影，不要大圆角（格子最多 4px）。

## 语义色

| 标记 | 用途 |
| --- | --- |
| `new` / `append` | 这一拍新算的格子 |
| `waste` | 被重复计算的过去 token |
| `cached` | 从缓存取出、不再投影 |
| `idle` | 占位，视觉上消失 |
| `repeat` / `unique` | 检视格里的重复 vs 独特 |
