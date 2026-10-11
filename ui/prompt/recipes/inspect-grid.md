# 配方：检视格

**读者卡在哪：** 二维结构被压成了表格或图片。Attention 分数、页锁 bitmap、加密块，本质上是格子，可格子不会说话。

**什么时候用：** 读者需要盯着某几格看，并且知道"这一格为什么特别"。ECB 的重复块、Attention 矩阵、缓存命中情况、二分查找里 lo / mid / hi 的位置。

**什么时候不用：** 只是一份普通的数据表，没有哪一格需要特别解释（用 `Table`，或者干脆写 Markdown 表格）。

**作者可能这样说：** "让读者点格子看解释""标出哪些块是重复的""矩阵里高亮这几格"。

**骨架：** `Grid` + 每行一个 `Row`；用 `tones` 标出特别的格子，用 `notes` 写每格的话，用 `legend` 解释颜色。需要切换场景时，加一个 `Choice` 或 `Toggle`。

````md
```ui
---
id: ecb-vs-cbc
caption: ECB 下相同的明文块得到相同的密文块；CBC 把上一块的密文混进来，重复就消失了。
intent: |
  明文四块 A B A A，让读者在 ECB 和 CBC 之间切换，看密文里重复的块。
---
<State mode="ecb" />

<Choice bind="mode" label="模式" options={[{ value: "ecb", label: "ECB" }, { value: "cbc", label: "CBC" }]} />

<Grid cols={["块1", "块2", "块3", "块4"]} legend={{ same: "密文与别的块相同" }}>
  <Row label="明文" cells={["A", "B", "A", "A"]} />
  <Row label="密文" cells={mode == "ecb" ? ["X", "Y", "X", "X"] : ["P", "Q", "R", "S"]}
       tones={mode == "ecb" ? ["same", "plain", "same", "same"] : "plain"}
       notes={mode == "ecb" ? ["和块3、块4相同", "", "和块1相同", "和块1相同"] : ["", "", "", ""]} />
</Grid>
```
````

**要点：**

- 颜色只用来标"特别"的格子，其余保持 `plain`。
- `notes` 写"这格为什么这样"，不要重复格子里的值。
- 格子里放短内容（1–4 个字符）；长内容放进 `notes`。
- 超过 16 × 16 时，只截出能说明问题的那一角。

**常见错误：**

- `cells`、`tones`、`notes` 长度和 `cols` 对不上。
- 整张格子都上色，读者不知道该看哪里。
- 用 `Grid` 摆一份普通数据表。
