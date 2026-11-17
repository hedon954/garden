---
title: 使用指南
navTitle: 使用指南
description: 覆盖建站初始化、AI 协作写作、全量配置与功能详解，以及独立管理后台的使用和部署。
section: guide
order: 10
---

Garden 把个人博客的日常维护浓缩为一条极简闭环：**本地写 Markdown → 自动预检 → Git 推送自动发布**。你不需要维护数据库、不需要手写路由或前端样式，也不必在源码仓库里混入构建产物。

## 完整生命周期概览

```garden compose
<stack gap={2}>
  <box padding={3} gap={1} radius="lg" background="surface-secondary" border="subtle">
    <title>1. 初始化轻量化内容仓</title>
    <text>运行 `npx hd-garden init` 创建只含配置与文稿目录的干净仓库。站点仓库只追踪 `site.config.yaml`、`content/`、`Makefile` 与协作技能，页面与构建脚本全部来自 `hd-garden` 依赖包。</text>
  </box>
  <arrow dir="down" />
  <box padding={3} gap={1} radius="lg" background="surface-secondary" border="subtle">
    <title>2. 纯 Markdown 与 AI 协作写作</title>
    <text>在 Typora 或编辑器中写正文，需要结构化图示或交互时写一句自然语言；通过 `garden-compose` 技能将其编译为经过校验的组件，`pre-commit` 钩子自动拦截未编译草稿或语法错误。</text>
  </box>
  <arrow dir="down" />
  <box padding={3} gap={1} radius="lg" background="surface-secondary" border="subtle">
    <title>3. 一键校验与 GitHub Pages 发布</title>
    <text>执行 `make update` 完成严格检查、提交推送，由 GitHub Actions 自动构建上线。支持单公开仓直接发布，也支持「私有源码仓 + 公开静态产物仓」双仓隔离模式，保护未公开草稿与写作历史。</text>
  </box>
  <arrow dir="down" />
  <box padding={3} gap={1} radius="lg" background="surface-secondary" border="subtle">
    <title>4. 按需接入独立管理后台</title>
    <text>公开博客始终是纯静态页面；需要对象存储上传、首页置顶、多平台分发或在线组件工作台时，再在本地启动或独立部署管理后台到云服务器 Docker 与 Cloudflare Workers。</text>
  </box>
</stack>
```

## 本章目录

```garden compose
<figure frame="none">
  <timeline title="使用指南阅读顺序">
    <event title="[快速上手](/garden/guide/quick-start/)">
      <text>从 init、配置、公开仓库、依赖、新文章、本地校验走到 make update 上线。</text>
    </event>
    <event title="[AI 协作](/garden/guide/ai-collaboration/)">
      <text>用真实样例走完一句自然语言、检查拦截、AI 重写到部署。</text>
    </event>
    <event title="[详细教程](/garden/guide/tutorial/)">
      <text>查阅配置字段、Front Matter、专栏组织，以及各项排版语法。</text>
    </event>
    <event title="[管理后台](/garden/guide/admin/)">
      <text>看 /admin 各模块与界面，并掌握本地、Docker 与 Workers 部署。</text>
    </event>
  </timeline>
</figure>
```
