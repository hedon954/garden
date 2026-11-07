import assert from "node:assert/strict";
import test from "node:test";
import { parseCompose, renderCompose } from "../ui/compose/index.mjs";

test("static scenes retain their existing default frame and HTML", () => {
  const parsed = parseCompose('<text>Body</text>');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.doc.frame, undefined);
  assert.equal(renderCompose(parsed.doc), '<figure class="g-compose"><div class="g-compose-body"><p class="g-compose-text">Body</p></div></figure>');
});

test("a single outer figure can opt out of scene framing without removing inner cards", () => {
  const parsed = parseCompose('<intent>Keep intent</intent><figure frame="none"><box><title>Title</title><text>Body</text></box><divider/></figure>');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.doc.frame, "none");
  assert.equal(parsed.doc.intent, "Keep intent");
  const html = renderCompose(parsed.doc);
  assert.match(html, /^<figure class="g-compose" data-frame="none">/);
  assert.match(html, /class="g-compose-card"/);
  assert.match(html, /class="g-compose-divider"/);
  assert.match(html, /Body/);
});

test("explicit card framing and ordinary nested figure layouts remain compatible", () => {
  const framed = parseCompose('<figure frame="card"><text>Body</text></figure>');
  assert.equal(framed.ok, true);
  assert.doesNotMatch(renderCompose(framed.doc), /data-frame="none"/);
  assert.equal(parseCompose('<stack><figure><text>Body</text></figure></stack>').ok, true);
});

test("invalid, nested or ambiguous scene frame declarations fail", () => {
  for (const source of [
    '<figure frame="transparent"><text>A</text></figure>',
    '<figure frame><text>A</text></figure>',
    '<stack><figure frame="none"><text>A</text></figure></stack>',
    '<list><figure frame="none"><text>A</text></figure><list-item><text>B</text></list-item></list>',
    '<figure frame="none"><text>A</text></figure><text>B</text>',
    '<figure><figure frame="none"><text>A</text></figure></figure>',
  ]) assert.equal(parseCompose(source).ok, false, source);
});
