import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ANCHOR_GAP,
  VIEWPORT_MARGIN,
  READABLE_MIN_WIDTH,
  READABLE_MAX_WIDTH,
  bindGardenPickerPlacement,
  placePickerMenu,
  resolvePickerWidth,
  measureMenuIntrinsicSize,
  scrollItemIntoContainer,
  viewportRect,
} from "../ui/garden/picker-placement.mjs";

function box(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

describe("placePickerMenu", () => {
  test("prefers opening below when the full list fits under the caret", () => {
    const placed = placePickerMenu({
      anchor: box(40, 80, 60, 18),
      viewport: box(0, 0, 1024, 800),
      menu: { width: 280, height: 200 },
    });
    assert.equal(placed.placement, "below");
    assert.equal(placed.top, 80 + 18 + ANCHOR_GAP);
    assert.equal(placed.maxHeight, 200);
    assert.equal(placed.width, READABLE_MIN_WIDTH);
    assert.ok(placed.top + placed.maxHeight <= 800 - VIEWPORT_MARGIN);
  });

  test("flips above when the caret is near the bottom of a short window", () => {
    // User-reported Typora window: 1024x611, /garden around x315 y519, list started at y527 and was clipped.
    const placed = placePickerMenu({
      anchor: box(315, 519, 72, 8),
      viewport: box(0, 0, 1024, 611),
      menu: { width: 320, height: 21 * 56 },
      preferredLeft: 315 - 15,
    });
    assert.equal(placed.placement, "above");
    assert.ok(placed.maxHeight <= 519 - ANCHOR_GAP - VIEWPORT_MARGIN);
    assert.equal(placed.top, 519 - ANCHOR_GAP - placed.maxHeight);
    assert.ok(placed.top >= VIEWPORT_MARGIN);
    assert.ok(placed.top + placed.maxHeight <= 519 - ANCHOR_GAP + 0.01);
    assert.ok(placed.left >= VIEWPORT_MARGIN);
    assert.ok(placed.left + placed.width <= 1024 - VIEWPORT_MARGIN);
  });

  test("keeps a long list below at the top of the viewport and clamps maxHeight for scrolling", () => {
    const placed = placePickerMenu({
      anchor: box(24, 16, 80, 20),
      viewport: box(0, 0, 800, 400),
      menu: { width: 300, height: 1400 },
    });
    assert.equal(placed.placement, "below");
    assert.equal(placed.maxHeight, 400 - VIEWPORT_MARGIN - (16 + 20 + ANCHOR_GAP));
    assert.ok(placed.maxHeight < 1400);
  });

  test("chooses the side with more room when neither side can show the full list", () => {
    const placed = placePickerMenu({
      anchor: box(40, 260, 50, 20),
      viewport: box(0, 0, 640, 400),
      menu: { width: 200, height: 900 },
    });
    assert.equal(placed.placement, "above"); // 260-gap-margin > space below to 400
    assert.ok(placed.spaceAbove > placed.spaceBelow);
    assert.equal(placed.maxHeight, placed.spaceAbove);
  });

  test("clamps width and left so the menu does not overflow the right edge", () => {
    const placed = placePickerMenu({
      anchor: box(900, 40, 40, 16),
      viewport: box(0, 0, 1024, 600),
      menu: { width: 360, height: 80 },
      preferredLeft: 900 - 15,
    });
    assert.equal(placed.placement, "below");
    assert.equal(placed.width, 360);
    assert.ok(placed.left + placed.width <= 1024 - VIEWPORT_MARGIN);
    assert.equal(placed.left, 1024 - VIEWPORT_MARGIN - 360);
  });

  test("shrinks width to the viewport when the menu is wider than the window", () => {
    const placed = placePickerMenu({
      anchor: box(20, 40, 40, 16),
      viewport: box(0, 0, 280, 400),
      menu: { width: 520, height: 80 },
    });
    assert.equal(placed.width, 280 - 2 * VIEWPORT_MARGIN);
    assert.equal(placed.left, VIEWPORT_MARGIN);
    assert.ok(placed.width < READABLE_MIN_WIDTH);
  });

  test("uses visualViewport offsets when the page is pinch-zoomed", () => {
    const viewport = viewportRect({
      innerWidth: 1024,
      innerHeight: 611,
      visualViewport: { width: 640, height: 380, offsetLeft: 80, offsetTop: 40 },
    });
    assert.deepEqual(viewport, box(80, 40, 640, 380));
    const placed = placePickerMenu({
      anchor: box(120, 360, 40, 16),
      viewport,
      menu: { width: 300, height: 500 },
    });
    assert.equal(placed.placement, "above");
    assert.ok(placed.top >= viewport.top + VIEWPORT_MARGIN);
    assert.ok(placed.left + placed.width <= viewport.right - VIEWPORT_MARGIN);
  });

  test("falls back to window inner size when visualViewport is missing", () => {
    assert.deepEqual(viewportRect({ innerWidth: 1024, innerHeight: 611 }), box(0, 0, 1024, 611));
  });
});

describe("scrollItemIntoContainer", () => {
  test("scrolls the active row into the visible window without using scrollIntoView", () => {
    const calls = [];
    const container = {
      scrollTop: 0,
      clientHeight: 100,
    };
    const item = { offsetTop: 240, offsetHeight: 50 };
    Object.defineProperty(container, "scrollTop", {
      get() { return this._top ?? 0; },
      set(value) { this._top = value; calls.push(value); },
    });
    assert.equal(scrollItemIntoContainer(container, item), true);
    assert.equal(calls.at(-1), 240 + 50 - 100);
    container._top = 240;
    item.offsetTop = 240;
    assert.equal(scrollItemIntoContainer(container, item), false);
  });
});

describe("bindGardenPickerPlacement", () => {
  test("repositions a garden menu near the bottom and cleans up listeners on destroy", () => {
    const listeners = new Map();
    const win = {
      innerWidth: 1024,
      innerHeight: 611,
      addEventListener(name, fn, opts) {
        listeners.set(`win:${name}:${Boolean(opts)}`, fn);
      },
      removeEventListener(name, fn, opts) {
        listeners.delete(`win:${name}:${Boolean(opts)}`);
      },
      requestAnimationFrame: (fn) => { fn(); return 1; },
      cancelAnimationFrame() {},
    };
    const style = {};
    const classNames = new Set(["ty-show"]);
    const dataset = {};
    const container = {
      style,
      dataset,
      scrollWidth: 320,
      scrollHeight: 21 * 56,
      classList: {
        contains: (name) => classNames.has(name),
        add: (name) => classNames.add(name),
        remove: (name) => classNames.delete(name),
      },
      querySelector: (sel) => sel === ".garden-suggest" ? {} : sel === "li.active" ? null : null,
      querySelectorAll: () => [],
      getBoundingClientRect: () => box(300, 527, 320, 84),
    };
    const handle = bindGardenPickerPlacement({
      container,
      win,
      getAnchorRect: () => box(315, 519, 72, 8),
      getViewport: () => box(0, 0, 1024, 611),
    });
    assert.equal(style.top, `${placePickerMenu({
      anchor: box(315, 519, 72, 8),
      viewport: box(0, 0, 1024, 611),
      menu: { width: 320, height: 21 * 56 },
      preferredLeft: 315 - 15,
    }).top}px`);
    assert.equal(dataset.gardenPlacement, "above");
    assert.ok(classNames.has("garden-picker-open"));
    assert.ok(listeners.size > 0);
    const count = listeners.size;
    handle.destroy();
    assert.equal(listeners.size, 0);
    assert.ok(!classNames.has("garden-picker-open"));
    assert.equal(dataset.gardenPlacement, undefined);
    assert.equal(count > 0, true);
    // A second destroy must not throw or rebind.
    handle.destroy();
    assert.equal(listeners.size, 0);
  });

  test("does not keep listeners when the menu is not a Garden picker", () => {
    const listeners = new Map();
    const win = {
      addEventListener(name, fn, opts) { listeners.set(`${name}:${Boolean(opts)}`, fn); },
      removeEventListener(name, fn, opts) { listeners.delete(`${name}:${Boolean(opts)}`); },
      requestAnimationFrame: (fn) => { fn(); return 1; },
    };
    const container = {
      style: {},
      dataset: {},
      scrollWidth: 160,
      scrollHeight: 80,
      classList: { contains: (name) => name === "ty-show", add() {}, remove() {} },
      querySelector: () => null,
      querySelectorAll: () => [],
      getBoundingClientRect: () => box(0, 0, 160, 80),
    };
    bindGardenPickerPlacement({
      container,
      win,
      isGardenMenu: () => false,
      getAnchorRect: () => box(10, 10, 10, 10),
      getViewport: () => box(0, 0, 800, 600),
    });
    assert.equal(listeners.size, 0);
  });
});


describe("resolvePickerWidth", () => {
  test("does not lock in a shrink-to-fit used width of ~95px", () => {
    assert.equal(resolvePickerWidth({ measuredWidth: 95, viewportWidth: 1024 }), READABLE_MIN_WIDTH);
    assert.ok(resolvePickerWidth({ measuredWidth: 95, viewportWidth: 1024 }) >= 360);
  });

  test("keeps a measured width between the readable floor and ceiling", () => {
    assert.equal(resolvePickerWidth({ measuredWidth: 400, viewportWidth: 1024 }), 400);
    assert.equal(resolvePickerWidth({ measuredWidth: 900, viewportWidth: 1024 }), READABLE_MAX_WIDTH);
  });

  test("shrinks only when the real viewport cannot fit the readable floor", () => {
    const width = resolvePickerWidth({ measuredWidth: 95, viewportWidth: 280 });
    assert.equal(width, 280 - 2 * VIEWPORT_MARGIN);
    assert.ok(width < READABLE_MIN_WIDTH);
  });
});

describe("measureMenuIntrinsicSize", () => {
  test("ignores a previously applied 95px maxWidth when measuring", () => {
    const style = { width: "95px", minWidth: "95px", maxWidth: "95px" };
    const container = {
      style,
      scrollWidth: 95,
      offsetWidth: 95,
      scrollHeight: 400,
    };
    const measured = measureMenuIntrinsicSize(container);
    assert.equal(measured.width, READABLE_MIN_WIDTH);
    assert.equal(style.maxWidth, "95px");
    assert.equal(style.width, "95px");
  });
});
