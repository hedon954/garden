# Compose 图标目录

一等标签：`<icon name="check-circle" size="lg"/>`（自闭合）。

描边 SVG，跟随 `currentColor`（即 ink）。

## 名称

| name | 用途 |
| --- | --- |
| `check` | 短勾 |
| `check-circle` | 成功/已选 |
| `x` | 叉 |
| `x-circle` | 失败/拒绝 |
| `lock` | 锁定 |
| `lock-open` | 解锁 |
| `arrow-down` / `arrow-up` / `arrow-left` / `arrow-right` | 方向 |
| `layers` | 分层 |
| `shield` | 策略/防护（亦可用 `mark="shield"`） |
| `user` | 用户 |
| `key` | 密钥/凭证 |
| `link` | 关联 |
| `alert` | 警告 |
| `info` | 说明 |
| `sparkles` | 强调/生成 |

未知 `name` → 编译失败。

## 属性

- `size`：`sm` | `md`（默认）| `lg` | `xl`
- `inline`：与文字同行时加一点右边距
