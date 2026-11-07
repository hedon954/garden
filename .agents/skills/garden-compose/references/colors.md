# Text/background colors · 文字与背景色

`color` sets foreground; `backgroundColor` sets background. Omission keeps the theme. Text inherits down the subtree; backgrounds do not inherit. Explicit child foreground overrides its parent's custom foreground.

Accepted literals: supported named CSS colors, `transparent`, hex 3/4/6/8 digits, valid rgb/rgba and hsl/hsla (including alpha). Examples: `#17324d`, `#17324d80`, `rgba(219,234,254,.5)`, `transparent`.

Static supported tags: box/card/row/stack/columns/grid/grid-item/pill/band/group/field/header/footer/figure/title/text/caption/label/prose/badge/kpi/stat/list/table/tr/th/td/thead/tbody. Play supported components: stack/columns/card/caption/badge/stat/table. This is not a promise that every static tag works in Play.

禁止 arbitrary `style`, CSS declarations, semicolons/injection, `url()`, `var()`, CSS functions outside the validator. Do not generalize this to every modern CSS color syntax. Validation is color-only, not a stylesheet escape hatch. 背景色与设计 token `background` 不同；无必要时保留主题 token。

Chart `palette="series|categorical"` and series `tone` remain chart-specific. Custom surface/text colors do not introduce arbitrary series fill/stroke props, nor change the palette contract. Verify contrast manually; transparent backgrounds reveal the surrounding theme.
