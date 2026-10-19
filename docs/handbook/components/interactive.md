---
title: 可调公式与参数（interactive）
navTitle: 可调公式与参数
description: 提供滑杆或单选按钮，让读者调整变量并实时计算公式与图表结果。
section: components
order: 38
badge: interactive
---

```garden interactive
caption: 拖动滑杆调整文章篇数与单篇图片数，实时计算构建后的静态文件总数
---
<State articles={12} imagesPerPost={3} />
<Let totalPages={articles + 6} />
<Let totalAssets={articles * imagesPerPost + 4} />
<Let totalFiles={totalPages + totalAssets} />

<Controls>
  <Slider label="长文篇数" state="articles" min={1} max={50} step={1} unit="篇" />
  <Slider label="每篇配图数" state="imagesPerPost" min={0} max={10} step={1} unit="张" />
</Controls>

<Result label="生成的静态文件总数" value="{totalFiles} 个文件" note="含 {totalPages} 个页面路由与 {totalAssets} 个媒体及索引文件" />
<Chart title="产物构成" x="类别" y="数量" unit="个" data="页面路由:{totalPages},媒体与索引:{totalAssets}" />
```

````markdown
```garden interactive
caption: 拖动滑杆调整文章篇数与单篇图片数，实时计算构建后的静态文件总数
---
<State articles={12} imagesPerPost={3} />
<Let totalPages={articles + 6} />
<Let totalAssets={articles * imagesPerPost + 4} />
<Let totalFiles={totalPages + totalAssets} />

<Controls>
  <Slider label="长文篇数" state="articles" min={1} max={50} step={1} unit="篇" />
  <Slider label="每篇配图数" state="imagesPerPost" min={0} max={10} step={1} unit="张" />
</Controls>

<Result label="生成的静态文件总数" value="{totalFiles} 个文件" note="含 {totalPages} 个页面路由与 {totalAssets} 个媒体及索引文件" />
<Chart title="产物构成" x="类别" y="数量" unit="个" data="页面路由:{totalPages},媒体与索引:{totalAssets}" />
```
````

- **用**：解释带多个变量的数学关系、容量估算或参数权衡，需要读者拖动滑杆实时观察结果变化时。
- **别用**：严禁放纯步骤切换器（没有 `<Slider>` / `<Choice>` 输入的 `<Steps>` 会报错 `steps-prose`）或形如 `a * b` 的平凡单次乘法（会报错 `interactive-trivial`）。

| 字段或标签 | 必填 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `caption` | 否 | YAML 字符串 | 分隔线 `---` 上方的图注说明 |
| `<State ... />` | 是 | 标签 | 定义初始状态变量（如 `<State n={10} />`） |
| `<Let name={...} />` | 建议 | 标签 | 根据状态变量实时计算派生值 |
| `<Slider />` / `<Choice />` | 是 | 控件标签 | 绑定 `state` 变量，提供滑杆（`min` / `max` / `step` / `unit`）或选项组（`options`） |
| `<Result />` / `<Stat />` | 建议 | 输出标签 | 用 `{变量名}` 模板展示实时计算结果 |
| `<Chart />` | 否 | 图表标签 | 用 `data="名称:{变量},..."` 渲染随参数变化的实时条形图 |
