import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pickerItems, pickerSelectionResult, slashQuery, suggestHtml } from "../ui/garden/snippets.mjs";
import { parseCompose } from "../ui/compose/markup.mjs";

const CORE = Symbol.for("typora-plugin-core@v2");
const COMMAND_HINT = `<span class="garden-suggest garden-suggest-command"><span class="garden-suggest-label">/garden</span><span class="garden-suggest-hint">插入组件想法</span></span>`;

/**
 * typora-community-plugin 2.10.73 EditorSuggest + EditorSuggestManager._onEdit
 * and the autoComplete.apply decorator, against Typora's public
 * editor.autoComplete.show(placeholder, bookmark, query, {search,render})
 * and editor.UserOp.pasteHandler(editor, markdown, true).
 *
 * show() reads the live `window.editor`, matching core's `ea=window.editor`.
 * These cases share that global, so they run one at a time.
 */
function typoraEditor() {
  return globalThis.editor;
}

class CommunityEditorSuggest {
  constructor() {
    this._query = "";
    this._placeholder = [];
    this._handlers = {
      search: this.getSuggestions.bind(this),
      render: this._renderSuggestion.bind(this),
    };
  }

  get isUsing() {
    return typoraEditor().autoComplete.state.all === this._placeholder;
  }

  canTrigger(textBefore) {
    return !!textBefore;
  }

  show(range, query) {
    this._query = query;
    typoraEditor().autoComplete.show(this._placeholder, range, query, this._handlers);
  }

  hide() {
    typoraEditor().autoComplete.hide();
  }

  _renderSuggestion(item, active) {
    const cls = `typ-suggestion ${active ? "active" : ""}`;
    const id = this.getSuggestionId(item);
    return `<li class="${cls}" data-content="${id}">${this.renderSuggestion(item)}</li>`;
  }

  renderSuggestion(item) {
    return item.toString();
  }

  _beforeApply(text) {
    return typeof text === "string" ? this.beforeApply(this.getSuggestionById(text)) : this.beforeApply(text);
  }

  lengthOfTextBeforeToBeReplaced(query) {
    return query.length + this.triggerText.length;
  }
}

function createTyporaEditor() {
  const calls = { show: [], hide: 0, paste: [], nativeApply: [] };
  const editor = {
    selection: {
      textAround: /** @type {unknown} */ ([]),
      getTextAround() {
        return this.textAround;
      },
    },
    autoComplete: {
      state: { all: null, match: null, anchor: null, query: undefined },
      show(placeholder, bookmark, query, handlers) {
        calls.show.push({ placeholder, bookmark, query, handlers });
        this.state.all = placeholder;
        this.state.anchor = bookmark;
        this.state.query = query;
        this.handlers = handlers;
        this.state.match = typeof query === "undefined" ? placeholder : handlers.search(query);
        if (Array.isArray(this.state.match) && this.state.match.length === 0) this.hide();
      },
      hide() {
        calls.hide += 1;
        this.state.all = null;
      },
      apply(text) {
        const suggest = editor._currentSuggest;
        if (suggest?.isUsing) {
          const start = this.state.anchor.start - suggest.lengthOfTextBeforeToBeReplaced(suggest._query);
          const markdown = suggest._beforeApply(text);
          calls.paste.push({
            markdown,
            isMarkdown: true,
            replaceStart: start,
            replaceEnd: this.state.anchor.end,
            id: text,
          });
          editor.UserOp.pasteHandler(editor, markdown, true);
          this.hide();
          return;
        }
        calls.nativeApply.push(text);
      },
    },
    UserOp: {
      pasteHandler(_editor, content, isMarkdown) {
        void _editor;
        void content;
        void isMarkdown;
      },
    },
    _currentSuggest: undefined,
    _editError: undefined,
  };
  return { editor, calls };
}

function onEdit(suggest) {
  const editor = typoraEditor();
  const around = editor.selection.getTextAround();
  const textBefore = around[0];
  const textAfter = around[1];
  const range = around[2];
  if (!range) return;
  try {
    if (!suggest.canTrigger(textBefore, textAfter, range)) return;
    editor._currentSuggest = suggest;
    const found = suggest.findQuery(textBefore, textAfter, range);
    const query = found.query ?? "";
    if (!found.isMatched) return;
    suggest.show(range, query);
  } catch (error) {
    editor._editError = error;
  }
}

/** The typora slash class before it extended EditorSuggest. */
function legacyGardenSlashSuggest() {
  return {
    triggerText: "/",
    replaceLength: 1,
    lead: "",
    phase: "command",
    findQuery(textBefore) {
      const parsed = slashQuery(textBefore);
      if (parsed.phase === "none") return { isMatched: false };
      this.phase = parsed.phase;
      this.replaceLength = parsed.replaceLength;
      this.lead = parsed.lead;
      return { isMatched: true, query: parsed.query };
    },
    getSuggestions(query) {
      if (this.phase === "command") return [{ kind: "command" }];
      const needle = query.trim().toLowerCase();
      return pickerItems().filter((item) => {
        if (!needle) return true;
        return item.label.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle);
      });
    },
    getSuggestionId(item) {
      return "kind" in item ? "command" : item.name || "idea";
    },
    getSuggestionById(id) {
      if (id === "command") return { kind: "command" };
      return pickerItems().find((item) => (item.name || "idea") === id);
    },
    renderSuggestion(item) {
      if ("kind" in item) return COMMAND_HINT;
      return suggestHtml(item);
    },
    beforeApply(item) {
      if ("kind" in item) return "/garden";
      return `${this.lead}${item.body}\n`;
    },
    lengthOfTextBeforeToBeReplaced() {
      return this.replaceLength;
    },
  };
}

function around(textBefore, textAfter = "") {
  return [textBefore, textAfter, { start: textBefore.length, end: textBefore.length, containerNode: { text: textBefore } }];
}

function installEditor(editor) {
  globalThis.window = globalThis;
  globalThis.editor = editor;
}

const notices = [];
const copied = [];
const testClipboard = {
  writeText(text) {
    return testClipboard.impl(text);
  },
  impl(text) {
    copied.push(text);
    return Promise.resolve();
  },
};
globalThis.window = globalThis;
const navigatorRef = globalThis.navigator;
if (navigatorRef && Object.getOwnPropertyDescriptor(globalThis, "navigator")?.configurable === false) {
  Object.defineProperty(navigatorRef, "clipboard", { configurable: true, writable: true, value: testClipboard });
} else {
  Object.defineProperty(globalThis, "navigator", { configurable: true, writable: true, value: { clipboard: testClipboard } });
}
globalThis[CORE] = {
  EditorSuggest: CommunityEditorSuggest,
  Notice: {
    success(message) { notices.push(["success", message]); },
    info(message) { notices.push(["info", message]); },
  },
};
const { GardenSlashSuggest } = await import("../editors/typora/src/slash-suggest.ts");

describe("Typora /garden slash suggest on typora-community-plugin 2.10.73", { concurrency: 1 }, () => {
  test("the pre-fix typora slash class never reaches autoComplete.show", () => {
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    editor.selection.textAround = around("/garden");
    onEdit(legacyGardenSlashSuggest());
    assert.equal(calls.show.length, 0);
    assert.equal(calls.paste.length, 0);
    assert.ok(editor._editError instanceof TypeError);
    assert.match(String(editor._editError.message), /canTrigger is not a function/u);
  });

  test("empty text and a missing caret bookmark do not open typora autocomplete", () => {
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    const suggest = new GardenSlashSuggest();
    assert.equal(typeof suggest.canTrigger, "function");
    assert.equal(typeof suggest.show, "function");
    assert.equal(typeof suggest._handlers.search, "function");
    assert.equal(typeof suggest._handlers.render, "function");
    assert.deepEqual(suggest._handlers.search(""), suggest.getSuggestions(""));

    editor.selection.textAround = [];
    onEdit(suggest);
    editor.selection.textAround = around("");
    onEdit(suggest);
    assert.equal(calls.show.length, 0);
    assert.equal(suggest.canTrigger("", "", { start: 0, end: 0 }), false);
  });

  test("non-matching text does not open typora autocomplete", () => {
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    const suggest = new GardenSlashSuggest();
    for (const text of ["hello", "/foo", "/gardening", "garden", "/garden\n", "／garden"]) {
      editor.selection.textAround = around(text);
      onEdit(suggest);
    }
    assert.equal(calls.show.length, 0);
    assert.equal(calls.paste.length, 0);
    assert.equal(editor._editError, undefined);
  });

  test("/ and /g show the garden command hint through typora autoComplete.show", () => {
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    const suggest = new GardenSlashSuggest();

    for (const text of ["/", "/g"]) {
      calls.show.length = 0;
      const textAround = around(text);
      const bookmark = textAround[2];
      editor.selection.textAround = textAround;
      onEdit(suggest);
      assert.equal(calls.show.length, 1, text);
      const shown = calls.show[0];
      assert.equal(shown.placeholder, suggest._placeholder);
      assert.equal(shown.bookmark, bookmark);
      assert.equal(shown.query, text.slice(1));
      assert.equal(shown.handlers, suggest._handlers);
      const items = shown.handlers.search(shown.query);
      assert.deepEqual(items, [{ kind: "command" }]);
      assert.deepEqual(editor.autoComplete.state.match, [{ kind: "command" }]);
      assert.equal(editor.autoComplete.state.all, suggest._placeholder);
      assert.equal(suggest.isUsing, true);
      const html = shown.handlers.render(items[0], true);
      assert.equal(html, `<li class="typ-suggestion active" data-content="command">${COMMAND_HINT}</li>`);
    }
  });

  function applyPicker(textBefore, id, textAfter = "") {
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    const suggest = new GardenSlashSuggest();
    editor.selection.textAround = around(textBefore, textAfter);
    onEdit(suggest);
    const shown = calls.show[0];
    editor.autoComplete.apply(id);
    const paste = calls.paste[0];
    const result = `${textBefore.slice(0, paste?.replaceStart ?? textBefore.length)}${paste?.markdown ?? ""}${textAfter}`;
    return { editor, calls, suggest, shown, paste, result };
  }

  test("/garden lists recommended diagrams plus 其他, and apply inserts the compose fence with the prompt", () => {
    copied.length = 0;
    notices.length = 0;
    const { calls, suggest, shown, result } = applyPicker("/garden", "other");
    const expected = pickerItems();
    const other = expected.at(-1);
    assert.equal(calls.show.length, 1);
    assert.equal(shown.query, "");
    assert.equal(shown.handlers, suggest._handlers);
    const items = shown.handlers.search("");
    assert.deepEqual(items.map((item) => item.name), expected.map((item) => item.name));
    assert.equal(other.name, "other");
    assert.equal(other.label, "其他");
    const html = shown.handlers.render(expected[0], false);
    assert.equal(html, `<li class="typ-suggestion " data-content="${expected[0].name}">${suggestHtml(expected[0])}</li>`);

    const otherHits = shown.handlers.search("其他");
    assert.ok(otherHits.some((item) => item.name === "other"));

    const inserted = `${pickerSelectionResult(other).insertText}\n`;
    assert.equal(calls.nativeApply.length, 0);
    assert.deepEqual(calls.paste, [{
      markdown: inserted,
      isMarkdown: true,
      replaceStart: 0,
      replaceEnd: "/garden".length,
      id: "other",
    }]);
    assert.equal(calls.hide, 1);
    assert.equal(suggest.isUsing, false);
    assert.equal(result, inserted);
    assert.match(result, /^```garden compose\n/);
    assert.ok(result.includes(other.prompt));
    assert.match(other.prompt, /自由组合任意 Markdown \/ HTML/);
    assert.match(other.prompt, /不要把结果限制为某一个现成模板/);
    assert.doesNotMatch(result, /\/garden/u);
    assert.equal(parseCompose(other.prompt).uncompiled, true);
    assert.deepEqual(copied, []);
    assert.deepEqual(notices, []);
  });

  test("apply replaces only the typed /garden query, including different filter lengths", () => {
    copied.length = 0;
    notices.length = 0;
    const layers = pickerItems().find((item) => item.name === "layers");
    const prefixes = [" /garden", " /garden 分层", " /garden 分层结构"];
    const prefix = "前文";
    const suffix = "后文";
    for (const typed of prefixes) {
      const textBefore = `${prefix}${typed}`;
      const inserted = `${slashQuery(textBefore).lead}${pickerSelectionResult(layers).insertText}\n`;
      const { paste, result } = applyPicker(textBefore, "layers", suffix);
      const expectedStart = prefix.length + 1; // space before /garden is kept
      assert.equal(paste.replaceStart, expectedStart, typed);
      assert.equal(paste.replaceEnd, textBefore.length, typed);
      assert.equal(paste.replaceEnd - paste.replaceStart, slashQuery(textBefore).replaceLength, typed);
      assert.equal(paste.markdown, inserted, typed);
      assert.equal(result, `${prefix} ${inserted}${suffix}`, typed);
      assert.ok(result.startsWith(prefix), typed);
      assert.ok(result.endsWith(suffix), typed);
      assert.ok(result.includes(layers.prompt), typed);
      assert.match(result, /```garden compose\n/);
      assert.doesNotMatch(result, /\/garden/u);
    }
    assert.deepEqual(copied, []);
    assert.deepEqual(notices, []);
  });

  test("a non-matching filter or cancel leaves the document unchanged", () => {
    copied.length = 0;
    notices.length = 0;
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    const suggest = new GardenSlashSuggest();
    const before = "前文 /garden zzzxxx";
    const after = "后文";
    editor.selection.textAround = around(before, after);
    onEdit(suggest);
    assert.equal(calls.paste.length, 0);
    assert.ok(calls.hide >= 1);
    assert.deepEqual(editor.selection.getTextAround(), around(before, after));

    const { editor: editor2, calls: calls2 } = createTyporaEditor();
    installEditor(editor2);
    const suggest2 = new GardenSlashSuggest();
    editor2.selection.textAround = around("/garden 分层", "后文");
    onEdit(suggest2);
    assert.equal(calls2.show.length, 1);
    editor2.autoComplete.hide();
    assert.equal(calls2.paste.length, 0);
    assert.deepEqual(copied, []);
    assert.deepEqual(notices, []);
  });

  test("accepting the / command hint pastes /garden and re-emits edit", async () => {
    const { editor, calls } = createTyporaEditor();
    installEditor(editor);
    let edits = 0;
    const suggest = new GardenSlashSuggest({ emit(name) { if (name === "edit") edits += 1; } });
    editor.selection.textAround = around("/");
    onEdit(suggest);
    assert.equal(calls.show.length, 1);
    editor.autoComplete.apply("command");
    assert.deepEqual(calls.paste, [{
      markdown: "/garden",
      isMarkdown: true,
      replaceStart: 0,
      replaceEnd: 1,
      id: "command",
    }]);
    assert.ok(edits >= 1, "reopen should be scheduled as soon as /garden is applied");
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.ok(edits >= 1);
  });
});
