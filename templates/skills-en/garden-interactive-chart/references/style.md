# Garden chart visuals

Follow the tokens in the site's `app/globals.css`, not the dark green glow of whatever article you are referencing.

## Tokens

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

Use the accent on one or two focal points at most. Newly computed uses `--new`, waste or repetition uses `--accent`, cached uses `--muted`.

## Type and density

```css
font-family: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
font-size: 13px;
line-height: 1.5;
```

Do not add Google Fonts. The text column is about 700px wide; draw for 640–680. Use multiples of 4 for control heights and spacing. No shadows, no large radii (4px at most on cells).

## Semantic colors

| Marker | Use |
| --- | --- |
| `new` / `append` | Cells newly computed at this beat |
| `waste` | Past tokens that are recomputed |
| `cached` | Read from the cache, not projected again |
| `idle` | Placeholder, visually gone |
| `repeat` / `unique` | Repeated vs unique in an inspect grid |
