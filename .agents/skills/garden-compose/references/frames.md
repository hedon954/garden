# Frame semantics · 不混淆三种外观设置

- Static `<box frame="card|band|pill|text">` / `<card ...>` controls that container's frame; `band`/`pill` are convenient aliases. This is a node property, not the whole fence header.
- Play fence header `frame: none` removes its outer UI frame; default is card. This is supported for Play and must not be advertised as a universal static-fence switch. Put it before the header separator `---`.
- `border="none"`, `background="transparent"`, and `backgroundColor="transparent"` affect different aspects of a supported node. Transparent background is not a border/frame removal API.

Don't add raw CSS to emulate unsupported framing. Don't promise frame:none for every rendering path; confirm the actual generated wrapper.
