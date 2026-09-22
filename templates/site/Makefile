MESSAGE ?= 更新博客

.DEFAULT_GOAL := help

.PHONY: help new embed skill prepare dev check build update

unexport TITLE SLUG DIR TOPIC URL
export GARDEN_NEW_TITLE := $(value TITLE)
export GARDEN_NEW_SLUG := $(value SLUG)
export GARDEN_NEW_DIR := $(value DIR)
export GARDEN_NEW_TOPIC := $(value TOPIC)
export GARDEN_EMBED_URL := $(value URL)

help:
	@printf "%s\n" "Garden 常用命令：" "  make new                 用引擎创建文章草稿" '  make new TITLE="文章标题" SLUG=my-post DIR=writing TOPIC="写作"' '  make embed URL="https://example.com"  拉取外部网页摘要' "  make skill               安装可交互图表 skill" "  make dev                 安装依赖并本地预览" "  make build               构建公开站点" "  make update              检查、提交并触发自动发布"

new: prepare
	npx garden new

embed:
	@npx garden embed

skill: prepare
	npx garden skill

prepare:
	@if [ ! -d node_modules ]; then npm install; fi

dev: prepare
	npx garden dev

check: prepare
	npx garden sync && npx garden build

build: prepare
	npx garden build

update:
	@if git diff --quiet && git diff --cached --quiet && [ -z "$$(git ls-files --others --exclude-standard)" ]; then \
		echo "没有需要发布的改动"; \
	else \
		$(MAKE) check && \
		git add -A && \
		git commit -m "$(MESSAGE)" && \
		git push origin HEAD; \
	fi
