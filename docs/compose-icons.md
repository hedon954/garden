# Compose 图标目录

用户手册可扫目录（字形 + 名字）：[`/garden/reference/compose-icons`](/garden/reference/compose-icons)。下面是仓库侧说明；完整列表以 `ICON_NAMES` / 手册页为准。


一等标签：`<icon name="check-circle" size="sm"/>`（自闭合）。

描边 SVG（Lucide，ISC），`viewBox="0 0 24 24"`，跟随 `currentColor`（即 ink）。默认描边约 1.75。

## 规模

当前具名图标 **690** 个（含常用别名键）。作者面目标是覆盖 ChatGPT 样例里出现的勾/锁/叉/箭头/层级等，并尽量贴近宿主 sprite 的广度（调研约 834）；未收录的品牌标等仍可继续补。

统计：`import { ICON_COUNT } from "../ui/compose/icons.mjs"`。

## 高频名称

| name | 用途 |
| --- | --- |
| `check` / `check-circle` | 短勾 / 成功 |
| `x` / `x-circle` | 叉 / 失败 |
| `minus` | 空日短横、减少 |
| `lock` / `lock-open` | 锁定 / 可推 |
| `arrow-down` / `arrow-up` / `arrow-left` / `arrow-right` | 方向 |
| `layers` / `layers-3` | 分层（`layers-3` 为别名） |
| `shield` | 策略/防护（亦可用 `mark="shield"`） |
| `user` / `users` | 用户 |
| `key` / `link` / `alert` / `info` / `sparkles` | 凭证、关联、警告、说明、强调 |
| `home` / `search` / `settings` / `bell` / `mail` / `send` | 导航与通知 |
| `calendar` / `clock` | 时间 |

完整列表以 `ICON_NAMES` 为准；未知 `name` → 编译失败。

## 别名

部分 ChatGPT / 旧名会映射到 Lucide 现名，例如：

- `check-circle` → 同键（内容来自 `circle-check`）
- `alert` → `triangle-exclamation-point`
- `home` → `house`
- `layers-3` → `layers`
- `filter` → `list-filter`

## 属性

- `size`：`sm` | `md`（默认）| `lg` | `xl`
- `inline`：与文字同行时加一点右边距

重新生成（可选）：把 Lucide `dist/esm/icons` 指到环境后跑 `node scripts/gen-compose-icons.mjs`。
