# Garden Compose

在一个场景里组合正文、说明图、资源、文件、关系和可调参数。叶子保留 Markdown 与安全 HTML。

```garden compose
用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
```

```garden compose
<intent>
用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。
</intent>
<steps>
  <step id="sync">
    <badge>1</badge>
    <title>sync</title>
    <text>同步内容与配置</text>
    <note>先对齐远程与本地材料</note>
  </step>
  <step id="build">
    <badge>2</badge>
    <title>build</title>
    <text>生成静态 HTML</text>
    <note>构建期把 compose 渲进正文</note>
  </step>
  <step id="validate">
    <badge>3</badge>
    <title>validate</title>
    <text>检查后再上线</text>
    <note>钩子拦住未编译的想法块</note>
  </step>
</steps>
```
