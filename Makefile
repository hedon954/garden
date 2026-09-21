MESSAGE ?= 更新博客

.DEFAULT_GOAL := help

.PHONY: help new embed skill prepare dev check build update

# Pass literal user input via environment, never interpolate it into shell code.
unexport TITLE SLUG DIR TOPIC URL
export GARDEN_NEW_TITLE := $(value TITLE)
export GARDEN_NEW_SLUG := $(value SLUG)
export GARDEN_NEW_DIR := $(value DIR)
export GARDEN_NEW_TOPIC := $(value TOPIC)
export GARDEN_EMBED_URL := $(value URL)

help:
	@printf "%s\n" "Garden 常用命令：" "  make new                 创建文章草稿（无需安装 npm 依赖）" '  make new TITLE="文章标题" SLUG=my-post DIR=writing TOPIC="写作"' '  make embed URL="https://example.com"  拉取外部网页摘要，打印可粘贴的 embed 围栏' "  make skill               安装可交互图表 skill" "  make dev                 首次准备并本地预览" "  make check               检查内容与测试" "  make build               构建公开站点" "  make update              检查、提交并触发自动发布" "  make update MESSAGE=\"新增一篇文章\"  自定义提交说明"

new:
	@node scripts/new-post.mjs

embed:
	@node scripts/fetch-embed.mjs

skill:
	@node bin/garden.mjs skill

prepare:
	@if [ ! -d node_modules ]; then npm ci; fi
	@if [ ! -f .env.local ]; then cp .env.example .env.local; fi

dev: prepare
	node bin/garden.mjs dev

check:
	npm run lint && npm test

build:
	node bin/garden.mjs build

update:
	@if git diff --quiet && git diff --cached --quiet && [ -z "$$(git ls-files --others --exclude-standard)" ]; then \
		echo "没有需要发布的改动"; \
	else \
		$(MAKE) check && \
		git add -A && \
		git commit -m "$(MESSAGE)" && \
		git push origin HEAD; \
	fi
