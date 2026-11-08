# Frame semantics · 不混淆三种外观设置

- Static `<box frame="card|band|pill|text">` / `<card ...>` controls that container's frame; `band`/`pill` are convenient aliases. This is a node property, not the whole fence header.
- Play fence header `frame: none` removes its outer UI frame; default is card. This is supported for Play and must not be advertised as a universal static-fence switch. Put it before the header separator `---`.
- `border="none"`, `background="transparent"`, and `backgroundColor="transparent"` affect different aspects of a supported node. Transparent background is not a border/frame removal API.

Don't add raw CSS to emulate unsupported framing. Don't promise frame:none for every rendering path; confirm the actual generated wrapper.

## 先选择层级，再动旋钮
1. 静态整个场景：唯一最外层`<figure frame="none">…</figure>`去场景边界；默认card。它不删除内部卡片，也不是Play头语法。
2. 内部容器：支持的card/box使用border或frame；card frame="text"是无表面的内容壳，不等于删除外场景。
3. 底色：background token或支持的backgroundColor；transparent不删除border。
“去外框”默认只改第1层；“无底色留内框”分别改第1、3层并保留第2层。编辑性说明偏向融入文章，独立实验保留必要边界；不因去框更换内容家族。
