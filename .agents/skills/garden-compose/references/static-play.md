# Static / Play capability matrix · 能力边界

| Requirement | Static diagram | Play |
|---|---|---|
| Markdown leaves, lowercase tags, nested layout, icons | Yes | Supported subset; use live prompt/catalog |
| Two cards, conceptual steps, compare/list-style layout | Compose generic containers | stack/columns/card supported |
| {@body}, {expr}, {#if}, {#each} | Not interpreted | Restricted expression/state language |
| Slider/choice/button changing reader state | Snapshot only, not real interaction | Bind value/onChange to declared state |
| Derived stat/table/chart values | Literal/static presentation | State + derived values; only supported expression ops |
| Chart palette/axis/legend | Do not assume Play chart API here | chart/bar/line APIs; confirm catalog |
| Arbitrary SVG graph edges or physics/canvas | No general-purpose graph/canvas API | No blanket parity with legacy relations/widgets |
| Browser/server/network APIs, eval, arbitrary JS | No | No |

Do not claim perfect parity because a tag has the same name as a legacy component. A static choice is not a quiz/answer engine; a few joins/arrows are not an arbitrary SVG graph. Use existing generic layout first. Check actual interactions and responsive output before claiming equivalence.

白话 `garden compose` 块是待编译意图，不是有效完成品。Play 用 `DIL.useState`、受限表达式和事件绑定；不能把任意 JS/React/HTML 塞进来。受支持标签与属性以 `garden ui prompt`、`garden ui schema` 及检查结果为准。不能实现的能力直接说明，不造新属性或误导「完全兼容」。
