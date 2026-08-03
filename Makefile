MESSAGE ?= 更新博客

.DEFAULT_GOAL := help

.PHONY: help prepare dev check build update

help:
	@printf "%s\n" "Garden 常用命令：" "  make dev                 首次准备并本地预览" "  make check               检查内容与测试" "  make build               构建公开站点" "  make update              检查、提交并触发自动发布" "  make update MESSAGE=\"新增一篇文章\"  自定义提交说明"

prepare:
	@if [ ! -d node_modules ]; then npm ci; fi
	@if [ ! -f .env.local ]; then cp .env.example .env.local; fi

dev: prepare
	npm run dev

check:
	npm run lint && npm test

build:
	npm run build

update:
	@if git diff --quiet && git diff --cached --quiet && [ -z "$$(git ls-files --others --exclude-standard)" ]; then \
		echo "没有需要发布的改动"; \
	else \
		$(MAKE) check && \
		git add -A && \
		git commit -m "$(MESSAGE)" && \
		git push origin HEAD; \
	fi
