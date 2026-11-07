import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { renderArticleContent } from '../ui/garden/article-content.mjs';

test('shared author content supports article Markdown and non-executable HTML/CSS', () => {
  const inline = renderArticleContent('**bold** _italic_ `code` [link](https://example.com) ~~gone~~ <u>under</u>', { inline: true });
  for (const expected of ['<strong>bold</strong>', '<em>italic</em>', '<code>code</code>', '<a href="https://example.com">link</a>', '<del>gone</del>', '<u>under</u>']) assert.ok(inline.includes(expected),expected);
  const block = renderArticleContent('## Heading\n\n- one\n- two\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><p>HTML</p></div>');
  for (const expected of ['<h2>', '<ul>', '<table>', 'grid-template-columns:', '<p>HTML</p>']) assert.ok(block.includes(expected),expected);
  assert.match(renderArticleContent('* literal footnote', { inline: true }), /^\* literal footnote$/);
  assert.match(renderArticleContent('<span style="font-family:\'a;b\';color:rgb(1,2,3)">text</span>'), /a;b/);
});

test('unsupported executable HTML, URL and CSS content fails explicitly', () => {
  for (const source of [
    '<script>alert(1)</script>', '<iframe src="https://example.com"></iframe>',
    '<img src="x" onerror="alert(1)">', '<a href="javascript:alert(1)">x</a>',
    '<a href="java&#x73;cript:alert(1)">x</a>', '<img src="data:image/svg+xml,evil">',
    '<div style="background:url(https://example.com/a)">x</div>',
    '<div style="background:image-set(\'https://example.com/a\' 1x)">x</div>',
    '<div style="color:red}body{display:none">x</div>',
    '<div style="display:grid;position:fixed">x</div>',
    '<div style="color:r/**/ed">x</div>',
  ]) assert.throws(() => renderArticleContent(source), { name: 'ArticleContentError' }, source);
});

test('browser content dependency graph has no PostCSS or Node builtin imports', async () => {
  const result = await build({ entryPoints: [new URL('../ui/garden/article-content.mjs', import.meta.url).pathname], bundle: true, platform: 'browser', format: 'esm', write: false, metafile: true, logLevel: 'silent' });
  assert.ok(result.outputFiles[0].text.includes('renderArticleContent'));
  assert.ok(!Object.keys(result.metafile.inputs).some(file => file.includes('/postcss/') || file.startsWith('node:')));
  assert.equal(result.metafile.outputs[Object.keys(result.metafile.outputs)[0]].imports.length,0);
});
