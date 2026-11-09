---
name: garden-compose
description: "将原文与一句效果或参考图，编译为 Garden Compose 内保真、可验证的说明布局；用于创作、微调及修复。"
---
# Garden Compose
只处理授权的文章/块；建议请求不写文件。不自动提交、发布、安装依赖或在文章任务中修改技能。

## 短决策链：问题 → 约束 → 推荐路线 → 原文 → 验证
1. 作者只需原文＋一句效果/参考图＋可选不要什么。分开事实、效果与修改范围；保留措辞、顺序、完整段落和资源，不补摘要、数据、因果。普通 Markdown 足够就不加组件。
2. 选型必读 `references/visual-selection.md`。AI 内部先判断移动阅读任务（扫读/顺序/对照/空间关系），必读 `references/mobile-contract.md`，写桌面＋窄屏约束卡，再取**唯一推荐路线**；不是限定合法组件的白名单。只在事实关系、隐藏内容、阅读顺序等重大取舍不明时询问；其余按已记录默认收敛，不让作者填技术表单。
3. 原文关键数值＋标签/单位用`metric`；独立解释类别用`equal-cards`，不造数值。标题＋徽标用`row align="center" justify="between" wrap="nowrap"`：justify管主轴、align管交叉轴，标题保留内容宽；nowrap仅约束局部，长标题仍须窄屏验收。按路线只读 `references/layout-recipes.md` 对应小节；陌生组合/参考图再读 `references/rendering-model.md`。需要新组合时读 `references/composition-patterns.md`，仍先建立共享容器。frame/tone/size是正交选择，不因微调换组件家族。
4. 作者组件只用 `garden compose`；内部静态/语义/交互能力按需读 `references/static-play.md`。语义字段、图标、允许子项以 `npx --no-install garden ui schema` 为准，按需存到 `.garden`，不预读整本目录。Markdown/安全HTML岛保存完整块内容；受限表达式不等于任意JS。

## 写入与验证
1. 必读 `references/workflow.md`：scan，保存id/行号、完整围栏base hash与原文。首次插入意图块和已有块apply不同；未编译意图不是完成品。
2. 先按 `references/rendering-model.md` 量宿主可用宽度与各层padding，再生成候选；不把主题/运行时挤压误诊成原文过长。正文默认继承文章动态字体/字号/行高；不缩字凑版。显式size只响应明确要求或真实层级。框读frames、颜色读colors；不要把场景框、内部边框和底色混为一谈。
3. 属性级微调优先，但当前apply仍替换完整围栏：候选文件＋稳定id（没有才用scan行号）＋原完整base hash；冲突即重读，不绕过保护。不误伤邻块或改写intent原话。
4. `scripts/check.mjs` 与 `garden check`保持原契约；有内部约束卡可另跑 `scripts/lint-layout.mjs`（workflow说明）。风险提示不等于语法错误；静态属性可能被丢弃，解析通过不等于生效。
5. 所有新布局都默认承担移动端责任，不等作者指出手机问题。按mobile-contract先验最窄屏和放大正文，再在完整主题与真实CSS顺序下检查桌面、computed样式、几何及阅读密度；交互另测正常首页Link进入、返回再进、后退/前进与直接链接；sandbox不能以强刷或_top代替修复。静态构建自动验导出资源，也可用 `garden verify --rendered` 重跑，但它不证明浏览器导航。分别报告：结构/解析、渲染、浏览器几何/交互、独立AI生成试验。没有对应证据就写未验证。

脚本仅使用已安装本地引擎，不下载包、不默认调用模型或导出全目录。缺依赖就报告；可复用维护经验只提出候选，不在文章任务里自行改技能。
