import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ensureTyporaActiveIndex,
  gardenEnterShouldApply,
  handleGardenSuggestEnter,
  isImeConfirmEnter,
  typoraIndexAfterSearch,
  typoraNativeEnterAction,
} from "../ui/garden/typora-suggest-contract.mjs";

const command = { kind: "command" };

describe("Typora 1.14.15 AutoComplete Enter contract", () => {
  test("a fresh show leaves index at -1, so native Enter hides and inserts a newline", () => {
    const index = typoraIndexAfterSearch(-1, 1);
    assert.equal(index, -1);
    assert.equal(typoraNativeEnterAction(index), "hide-and-newline");
  });

  test("after ArrowDown typora applies the active item and prevents the default", () => {
    assert.equal(typoraIndexAfterSearch(0, 1), 0);
    assert.equal(typoraNativeEnterAction(0), "apply");
  });
});

describe("Garden Enter on the /garden command hint", () => {
  test("Enter with typora index -1 applies the command instead of a newline", () => {
    const events = [];
    const event = {
      key: "Enter",
      isComposing: false,
      keyCode: 13,
      preventDefault() { events.push("preventDefault"); },
      stopPropagation() { events.push("stopPropagation"); },
    };
    const applied = [];
    const action = handleGardenSuggestEnter(event, {
      shown: true,
      isGardenMenu: true,
      match: [command],
      index: typoraIndexAfterSearch(-1, 1),
      apply: (item) => applied.push(item),
    });
    assert.equal(action, "apply");
    assert.deepEqual(applied, [command]);
    assert.deepEqual(events, ["preventDefault", "stopPropagation"]);
  });

  test("IME confirming Enter does not apply or preventDefault", () => {
    for (const event of [
      { key: "Enter", isComposing: true, keyCode: 13, preventDefault() { throw new Error("prevented"); }, stopPropagation() {} },
      { key: "Enter", isComposing: false, keyCode: 229, preventDefault() { throw new Error("prevented"); }, stopPropagation() {} },
      { key: "Process", isComposing: false, keyCode: 229, preventDefault() { throw new Error("prevented"); }, stopPropagation() {} },
    ]) {
      assert.equal(isImeConfirmEnter(event), true);
      assert.equal(gardenEnterShouldApply(event, { shown: true, matchLength: 1 }), false);
      assert.equal(handleGardenSuggestEnter(event, {
        shown: true,
        isGardenMenu: true,
        match: [command],
        index: 0,
        apply: () => { throw new Error("applied during IME"); },
      }), "ime");
    }
  });

  test("Tab, Escape, and shifted Enter are left to typora", () => {
    const apply = () => { throw new Error("should not apply"); };
    assert.equal(handleGardenSuggestEnter({ key: "Tab" }, { shown: true, isGardenMenu: true, match: [command], index: -1, apply }), "ignore");
    assert.equal(handleGardenSuggestEnter({ key: "Escape" }, { shown: true, isGardenMenu: true, match: [command], index: 0, apply }), "ignore");
    assert.equal(handleGardenSuggestEnter({ key: "Enter", shiftKey: true }, { shown: true, isGardenMenu: true, match: [command], index: 0, apply }), "ignore");
    assert.equal(handleGardenSuggestEnter({ key: "Enter" }, { shown: true, isGardenMenu: false, match: [command], index: -1, apply }), "ignore");
  });

  test("ensureTyporaActiveIndex promotes a fresh -1 index so typora highlight matches Enter", () => {
    const state = { match: [command], index: typoraIndexAfterSearch(-1, 1) };
    assert.equal(state.index, -1);
    assert.equal(ensureTyporaActiveIndex(state), true);
    assert.equal(state.index, 0);
    assert.equal(typoraNativeEnterAction(state.index), "apply");
  });
});
