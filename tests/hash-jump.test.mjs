import assert from "node:assert/strict";
import test from "node:test";

import { HASH_JUMP_SCRIPT, HASH_JUMP_WINDOW_MS } from "../ui/garden/hash-jump.mjs";

const pageUrl = new URL("https://example.com/blog/post/?v=1");

/** A window that runs listeners in the order they were added, as Chrome does on window. */
function fakeWindow() {
  const listeners = { click: [], popstate: [] };
  let clock = 0;
  const win = {
    location: pageUrl,
    addEventListener: (type, fn) => listeners[type].push(fn),
  };
  new Function("window", "Date", "URL", HASH_JUMP_SCRIPT)(win, { now: () => clock }, URL);
  const anchor = (href, attrs = {}) => ({
    getAttribute: (name) => (name === "href" ? href : (attrs[name] ?? null)),
    hasAttribute: (name) => name in attrs,
  });
  const click = (href, extra = {}, attrs = {}) => {
    const a = href === null ? null : anchor(href, attrs);
    const event = { button: 0, defaultPrevented: false, ...extra, target: { closest: () => a } };
    listeners.click.forEach((fn) => fn(event));
  };
  /** Fires popstate; true when the router (added after the guard) never saw it. */
  const popstate = (state) => {
    let routerSaw = false;
    let stopped = false;
    const event = { state, stopImmediatePropagation: () => { stopped = true; } };
    for (const fn of [...listeners.popstate, () => { routerSaw = true; }]) {
      if (stopped) break;
      fn(event);
    }
    return !routerSaw;
  };
  return { listeners, click, popstate, tick: (ms) => (clock += ms) };
}

test("the popstate right after an in-page #jump never reaches the router", () => {
  const w = fakeWindow();
  assert.equal(w.listeners.click.length, 1);
  assert.equal(w.listeners.popstate.length, 1);

  w.click("#setup");
  assert.equal(w.popstate(null), true, "fragment navigation: swallowed");
  assert.equal(w.popstate(null), false, "the next Back is the router's again");

  w.click("/blog/post/?v=1#setup");
  assert.equal(w.popstate(null), true, "the full same-page address counts too");

  w.click("#setup");
  assert.equal(w.popstate({ __vinext: 1 }), false, "an entry with router state is a real traversal");

  w.click("#late");
  w.tick(HASH_JUMP_WINDOW_MS + 1);
  assert.equal(w.popstate(null), false, "a popstate long after the click is not the jump's");
});

test("clicks that are not a plain same-page #jump leave popstate to the router", () => {
  const cases = [
    ["/blog/other/#a"],
    ["/blog/post/#a", {}, {}, "a different query is a different page"],
    ["https://elsewhere.org/blog/post/?v=1#a"],
    ["#"],
    ["/blog/post/?v=1"],
    ["#a", { metaKey: true }],
    ["#a", { button: 1 }],
    ["#a", { defaultPrevented: true }, {}, "the TOC or a Link handled it already"],
    ["#a", {}, { target: "_blank" }],
    ["#a", {}, { download: "" }],
    [null],
  ];
  for (const [href, extra = {}, attrs = {}, note = href] of cases) {
    const w = fakeWindow();
    w.click(href, extra, attrs);
    assert.equal(w.popstate(null), false, String(note));
  }
});

test("the guard ships inline in <head>, ahead of the router's module scripts", async () => {
  const fs = await import("node:fs");
  const layout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const head = layout.slice(layout.indexOf("<head>"), layout.indexOf("</head>"));
  assert.match(head, /<script dangerouslySetInnerHTML=\{\{ __html: HASH_JUMP_SCRIPT \}\} \/>/u);
  assert.doesNotMatch(HASH_JUMP_SCRIPT, /<\/script/iu);
});
