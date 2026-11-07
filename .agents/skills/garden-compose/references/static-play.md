# One Compose entry · Static / Play / content

作者始终写 `garden compose`，内部按读者任务选择组件，不能另选组件围栏。小写标签是作者语言；内部编译 IR 不是另一种作者接口。

| 任务 | 能力与边界 |
|---|---|
| 静态结构与排版 | row/group/stack/grid 等；真实 divider/separator；必须核对直接/嵌套上下文与响应式行为。|
| 文章内容 | markdown/html 岛，共享文章 Markdown/GFM 与安全 HTML/CSS；text/title/caption 是行内上下文。|
| 语义场景 | resources/resource/point/reference、metric、timeline/event、compare/item、icon-list/entry、files/file、relations/entity/edge、choices/choice-option、plot/datum。字段与允许子项查实际 schema，不复制一份枚举清单。|
| 原生交互 | Garden 文章 host 复用选项回复/键盘、关系细节、文件预览等行为；静态快照不是完整交互宿主。关系3–6项，不是任意大图编辑器。|
| 可调参数 | Play 头 caption 与 ---；`{@body const [n,setN]=DIL.useState(3)}`、派生值、{expr}、#if/#each、小写控件与 chart/pie/table。表达式受限，不是任意 JS。|
| 独立可执行演示 | 同一 Compose 的 sandbox，字面 html/css/js；隔离离线 iframe，允许沙盒内 DOM/JS，不共享父页面 origin。网络/API 不因此获得授权/支持。|

## 字面内容与表达式不能混为一谈
完整 Markdown 块用内容岛；不是在任意标签层次粘一份 HTML 页面。岛内不进行 Play 表达式插值，动态值放岛外组件节点。行内支持 **bold**、_emphasis_、`code`、链接、~~strike~~、<u>安全下划线</u>；<u> 是 HTML 而非标准 Markdown。允许的 HTML 标签、属性及本地 style 属性在 schema 中按真实验证器给出；不把整个 HTML/CSS 都禁掉，也不接受 script/events/javascript URL 或可执行网络 CSS。

Static outer frame defaults on, opt out with one outer `<figure frame="none">…</figure>`. Play uses header `frame: none`. This does not remove nested card surfaces. Body family/size follow the actual article; semantic labels/values/captions/controls keep hierarchy.

不能以「同名标签」或单纯枚举通过宣称等价。对用到的能力实际 parse/check/render、检查完整主题与状态变化；Feed/Markdown 是可读回退（文件保留有效链接），独立宿主与静态快照不等于文章所有交互。没有独立新模型试验就不声称提示词生成可靠。
