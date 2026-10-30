# Changelog

## 0.10.2

Same-site and external jump links share one link-card pipeline (bare URL paragraphs and `{card}`). Build marks standalone jump URLs as cards and follows HTML meta refresh when fetching OG. Pathname `/og.png` is never used as a card cover. Blog/column pages without a cover use twitter `summary` and omit the brand `/og.png` fallback. Site `public/og.png` refreshed (1200×630) with updated layout/handbook OG alt.

## 0.10.1

List pages share one PageIntro (eyebrow, title, deck). Primary nav drops 标签; `/tags/` stays. Blog and column articles share PostReadingView: classic title, 约N字 meta, and the v0.10.0 sticky TOC. A column article adds a desktop SeriesEdgeNav of that column only.

## 0.10.0

Restore the pre-bookshelf engine. The source tree matches tag [`v0.8.4`](https://github.com/hedon954/garden/releases/tag/v0.8.4) (commit `41964cba`), except this version and this note. This is not a republish of 0.8.4.

The bookshelf added in 0.9.0–0.9.4 is removed: `/bookshelf` routes, shelf components, catalog and demo data, navigation entries, handbook sections, sample notes and covers, and bookshelf tests.
