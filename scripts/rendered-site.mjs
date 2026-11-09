import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseHtml } from 'parse5';
import { parse as parseJs } from 'acorn';
import postcss from 'postcss';
import { gardenSiteRoot } from './garden-paths.mjs';

// Export integrity is a separate boundary from browser layout and interaction.
export function verifyRenderedSite(directory, { basePath = '' } = {}) {
  const root = path.resolve(directory);
  const errors = [];
  const checked = new Set();
  const css = new Map();
  const cssImports = new Map();
  const prefix = basePath.replace(/\/$/u, '');
  const fail = (file, code, detail) => errors.push({ file, code, detail });
  const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.isFile() && entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);
  const walk = (node, visit) => {
    const pending = [node];
    while (pending.length) {
      const current = pending.pop();
      visit(current);
      for (const value of Object.values(current)) {
        if (Array.isArray(value)) for (const item of value) { if (item?.type) pending.push(item); }
        else if (value?.type) pending.push(value);
      }
    }
  };
  function asset(href, owner) {
    if (!href || /^(?:data:|blob:|#)/iu.test(href)) return null;
    let url, pathname;
    try {
      url = new URL(href, `https://garden-export.invalid${prefix}/${owner}`);
      if (url.origin !== 'https://garden-export.invalid') return null;
      pathname = decodeURIComponent(url.pathname);
    } catch {
      fail(owner, 'asset-url-invalid', href);
      return null;
    }
    if (prefix && (pathname === prefix || pathname.startsWith(prefix + '/'))) pathname = pathname.slice(prefix.length);
    const target = path.resolve(root, '.' + pathname);
    const relative = path.relative(root, target);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) { fail(owner, 'asset-outside-export', href); return null; }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { fail(owner, 'asset-missing', href); return null; }
    const actual = path.relative(fs.realpathSync(root), fs.realpathSync(target));
    if (actual === '..' || actual.startsWith('..' + path.sep) || path.isAbsolute(actual)) { fail(owner, 'asset-outside-export', href); return null; }
    if (checked.has(relative)) return relative;
    checked.add(relative);
    if (target.endsWith('.css')) {
      let sheet;
      try { sheet = postcss.parse(fs.readFileSync(target, 'utf8'), { from: relative }); }
      catch (error) { fail(relative, 'style-syntax', error.reason); return relative; }
      const selectors = [];
      sheet.walkRules(rule => selectors.push(rule.selector));
      css.set(relative, selectors.join('\n'));
      const imports = [];
      sheet.walkAtRules('import', rule => {
        const match = /^(?:["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\))/u.exec(rule.params);
        if (match) { const imported = asset(match[1] ?? match[2], relative); if (imported) imports.push(imported); }
      });
      cssImports.set(relative, imports);
      sheet.walkDecls(decl => {
        for (const match of decl.value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gu)) asset(match[1] ?? match[2] ?? match[3], relative);
      });
    }
    if (target.endsWith('.js') || target.endsWith('.mjs')) {
      let tree;
      try { tree = parseJs(fs.readFileSync(target, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' }); }
      catch (error) { fail(relative, 'script-syntax', error.message); return relative; }
      walk(tree, node => {
        const source = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) ? node.source : null;
        if (typeof source?.value !== 'string') return;
        if (!/^(?:\.|\/|https?:|data:)/u.test(source.value)) fail(relative, 'unbundled-module', source.value);
        else asset(source.value, relative);
      });
    }
    return relative;
  }
  if (!fs.existsSync(root)) return { pages: 0, assets: 0, errors: [{ file: '.', code: 'export-missing', detail: 'Build the static site first.' }] };
  const pages = files(root);
  if (!pages.length) fail('.', 'pages-missing', 'No exported HTML pages.');
  for (const file of pages) {
    const owner = path.relative(root, file).split(path.sep).join('/');
    const document = parseHtml(fs.readFileSync(file, 'utf8'));
    const elements = [];
    const collect = node => { if (node.tagName) elements.push(node); for (const child of node.childNodes ?? []) collect(child); };
    collect(document);
    let entry = false;
    let redirect = false;
    const styles = [];
    const classes = new Set();
    for (const node of elements) {
      const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
      for (const name of (attrs.class ?? '').split(/\s+/u)) classes.add(name);
      if (node.tagName === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh') redirect = true;
      if (node.tagName === 'script' && attrs.src) { asset(attrs.src, owner); if (attrs.type === 'module') entry = true; }
      if (node.tagName === 'link' && (attrs.rel ?? '').split(/\s+/u).some(rel => rel === 'stylesheet' || rel === 'modulepreload')) {
        const name = asset(attrs.href, owner);
        if ((attrs.rel ?? '').split(/\s+/u).includes('stylesheet') && !Object.hasOwn(attrs, 'disabled') && name) styles.push(name);
      }
    }
    if (classes.has('garden-ui') && !entry) fail(owner, 'runtime-entry-missing', 'An interactive runtime requires its module entry; static Compose remains readable without JavaScript.');
    if (!redirect && owner.endsWith('index.html') && entry) {
      const payload = file.replace(/index\.html$/u, 'index.txt');
      if (!fs.existsSync(payload)) fail(owner, 'navigation-payload-missing', 'index.txt');
      else if (!/^[\da-f]+:/mu.test(fs.readFileSync(payload, 'utf8'))) fail(owner, 'navigation-payload-invalid', 'index.txt is not a Flight payload.');
    }
    if (classes.has('g-compose') || classes.has('garden-ui')) {
      const reachable = new Set();
      const pending = [...styles];
      while (pending.length) {
        const name = pending.pop();
        if (reachable.has(name)) continue;
        reachable.add(name);
        pending.push(...(cssImports.get(name) ?? []));
      }
      const loaded = [...reachable].map(name => css.get(name) ?? '').join('\n');
      if ((classes.has('g-compose') && !loaded.includes('.g-compose-row')) || (classes.has('garden-ui') && !loaded.includes('.garden-ui'))) fail(owner, 'compose-styles-missing', 'The page must link the actual styles for its Compose/runtime markup.');
    }
  }
  return { pages: pages.length, assets: checked.size, errors, scope: 'export-asset-integrity', browserLayout: 'not-verified', clientInteraction: 'not-verified' };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const report = verifyRenderedSite(path.join(gardenSiteRoot(), 'dist/client'), { basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '' });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.errors.length ? 1 : 0;
}
