MESSAGE ?= 更新博客

.DEFAULT_GOAL := help

.PHONY: help new embed skill prepare dev check diff build update

unexport TITLE SLUG DIR URL FILE
export GARDEN_NEW_TITLE := $(value TITLE)
export GARDEN_NEW_SLUG := $(value SLUG)
export GARDEN_NEW_DIR := $(value DIR)
export GARDEN_EMBED_URL := $(value URL)
export GARDEN_CHECK_FILE := $(value FILE)

help:
	@printf "%s\n" "Garden 常用命令：" "  make new                 用引擎创建文章草稿" '  make new TITLE="文章标题" SLUG=my-post DIR=writing' '  make embed URL="https://example.com"  拉取外部网页摘要' "  make skill               安装可交互图表 skill" "  make dev                 安装依赖并本地预览" "  make check               全量严格预检后 sync/build；FILE=路径 只限制预检" "  make check diff          只检查 Git 改动的 Markdown，不构建/跑全套测试" "  make build               构建公开站点" "  make update              检查、提交并触发自动发布"

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

# Parse goals once: even make -j check diff runs only one diff preflight.
ifneq ($(filter diff,$(MAKECMDGOALS)),)
check:
	npx --no-install garden verify --diff
diff: check
else
check: prepare
	npx --no-install garden verify
	npx garden sync && npx garden build
endif

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
