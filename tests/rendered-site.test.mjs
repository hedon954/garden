import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyRenderedSite } from '../scripts/rendered-site.mjs';

function fixture(t, base = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-export-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'index.html'), `<!doctype html><link rel="stylesheet" href="${base}/assets/ui.css"><script type="module" src="${base}/assets/entry.js"></script><figure class="g-compose"><div class="g-compose-row"></div></figure><script>self.payload='&lt;script src="/not-a-real-element.js"&gt;'</script>`);
  fs.writeFileSync(path.join(root, 'index.txt'), '0:["Flight test fixture"]');
  fs.writeFileSync(path.join(root, 'assets/ui.css'), '.g-compose-row{display:flex}.garden-ui{display:block}');
  fs.writeFileSync(path.join(root, 'assets/entry.js'), 'import "./nested.js"; import("./lazy.js");');
  fs.writeFileSync(path.join(root, 'assets/nested.js'), 'export const ready = true;');
  fs.writeFileSync(path.join(root, 'assets/lazy.js'), 'export default 42;');
  return root;
}

test('export gate resolves actual HTML and all literal module imports, ignoring embedded RSC strings', t => {
  const report = verifyRenderedSite(fixture(t));
  assert.deepEqual(report.errors, []);
  assert.equal(report.pages, 1);
  assert.equal(report.assets, 4);
  assert.equal(report.clientInteraction, 'not-verified');
});
test('export gate respects the configured base path', t => {
  assert.deepEqual(verifyRenderedSite(fixture(t, '/garden'), { basePath: '/garden' }).errors, []);
});
test('export gate catches a missing lazy module', t => {
  const root = fixture(t); fs.unlinkSync(path.join(root, 'assets/lazy.js'));
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'asset-missing' && error.detail === './lazy.js'));
});
test('export gate rejects a Compose page whose real stylesheet lost runtime rules', t => {
  const root = fixture(t); fs.writeFileSync(path.join(root, 'assets/ui.css'), 'body{color:black}');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'compose-styles-missing'));
});
test('export gate catches missing and corrupt client-navigation payloads', t => {
  const root = fixture(t); fs.unlinkSync(path.join(root, 'index.txt'));
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'navigation-payload-missing'));
  fs.writeFileSync(path.join(root, 'index.txt'), '<!doctype html><h1>Wrong response</h1>');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'navigation-payload-invalid'));
});
test('export gate rejects unbundled imports and invalid JavaScript', t => {
  const root = fixture(t); fs.writeFileSync(path.join(root, 'assets/lazy.js'), 'import "react";');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'unbundled-module'));
  fs.writeFileSync(path.join(root, 'assets/lazy.js'), 'export const broken = ;');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'script-syntax'));
});
test('export gate allows plain redirect pages and reports missing export roots', t => {
  const root = fixture(t); fs.mkdirSync(path.join(root, 'old'));
  fs.writeFileSync(path.join(root, 'old/index.html'), '<meta http-equiv="refresh" content="0; url=/">');
  assert.deepEqual(verifyRenderedSite(root).errors, []);
  assert.equal(verifyRenderedSite(path.join(root, 'absent')).errors[0].code, 'export-missing');
});

test('export gate reports malformed asset URLs instead of crashing', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'index.html'), '<script src="/%invalid.js"></script>');
  assert.equal(verifyRenderedSite(root).errors[0].code, 'asset-url-invalid');
});

test('export gate follows imported styles and their local font/image assets', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'assets/ui.css'), '@import "./compose.css";');
  fs.writeFileSync(path.join(root, 'assets/compose.css'), '.g-compose-row{display:flex;background:url("./marker.svg")}@font-face{font-family:Fixture;src:url(./fixture.woff2)}');
  fs.writeFileSync(path.join(root, 'assets/marker.svg'), '<svg/>');
  fs.writeFileSync(path.join(root, 'assets/fixture.woff2'), 'Neutral asset existence fixture');
  assert.deepEqual(verifyRenderedSite(root).errors, []);
  fs.unlinkSync(path.join(root, 'assets/marker.svg'));
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'asset-missing' && error.detail === './marker.svg'));
});
test('export gate does not mistake comments or a disabled stylesheet for loaded Compose rules', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'assets/ui.css'), '/* .g-compose-row .garden-ui */body{color:black}');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'compose-styles-missing'));
  fs.writeFileSync(path.join(root, 'assets/ui.css'), '.g-compose-row{display:flex}');
  fs.writeFileSync(path.join(root, 'index.html'), '<link rel="stylesheet" disabled href="/assets/ui.css"><figure class="g-compose"></figure>');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'compose-styles-missing'));
});
test('export gate distinguishes static no-JS prose from an accidentally missing runtime entry', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'index.html'), '<link rel="stylesheet" href="/assets/ui.css"><figure class="g-compose">Readable static prose</figure>');
  assert.deepEqual(verifyRenderedSite(root).errors, []);
  fs.writeFileSync(path.join(root, 'index.html'), '<link rel="stylesheet" href="/assets/ui.css"><figure class="garden-ui"></figure>');
  assert.ok(verifyRenderedSite(root).errors.some(error => error.code === 'runtime-entry-missing'));
});
