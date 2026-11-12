import { bindGardenPickerPlacement, caretClientRect, typoraAutoSuggestElement } from "../../../ui/garden/picker-placement.mjs";
import { bindGardenPickerKeys, ensureTyporaActiveIndex, scheduleGardenCommandReopen } from "../../../ui/garden/typora-suggest-contract.mjs";
import { filterPickerItems, pickerItems, pickerSelectionResult, slashQuery, suggestHtml } from "../../../ui/garden/snippets.mjs";

type PickerItem = ReturnType<typeof pickerItems>[number];
type SlashCommand = { kind: "command" };
export type SlashChoice = SlashCommand | PickerItem;
export type EditBus = { emit?(name: "edit"): void };

type EditorSuggestCtor = new () => {
  triggerText?: string;
  canTrigger(textBefore: string, textAfter: string, range: unknown): boolean;
  show(range: unknown, query: string): void;
  hide(): void;
  lengthOfTextBeforeToBeReplaced(query: string): number;
};

const core = (window as unknown as Record<symbol, {
  EditorSuggest: EditorSuggestCtor;
  Notice: { info(message: string): void; success(message: string): void };
}>)[Symbol.for("typora-plugin-core@v2")];

/** `/` offers the `/garden` command. Accepting it opens the thumbnail picker. */
export class GardenSlashSuggest extends core.EditorSuggest {
  triggerText = "/";
  private readonly edits: EditBus | undefined;
  private replaceLength = 1;
  private lead = "";
  private phase: "command" | "components" = "command";
  private placement: { apply(): void; destroy(): void } | undefined;
  private keys: { destroy(): void } | undefined;

  constructor(edits: EditBus | undefined) {
    super();
    this.edits = edits;
  }

  findQuery(textBefore: string) {
    const parsed = slashQuery(textBefore);
    if (parsed.phase === "none") return { isMatched: false as const };
    this.phase = parsed.phase === "components" ? "components" : "command";
    this.replaceLength = parsed.replaceLength;
    this.lead = parsed.lead;
    return { isMatched: true as const, query: parsed.query };
  }

  getSuggestions(query: string): SlashChoice[] {
    if (this.phase === "command") return [{ kind: "command" }];
    return filterPickerItems(query);
  }

  getSuggestionId(item: SlashChoice) {
    return "kind" in item ? "command" : item.name || "idea";
  }

  getSuggestionById(id: string): SlashChoice | undefined {
    if (id === "command") return { kind: "command" };
    return pickerItems().find((item) => (item.name || "idea") === id);
  }

  renderSuggestion(item: SlashChoice) {
    if ("kind" in item) {
      return `<span class="garden-suggest garden-suggest-command"><span class="garden-suggest-label">/garden</span><span class="garden-suggest-hint">插入组件想法</span></span>`;
    }
    return suggestHtml(item);
  }

  beforeApply(item: SlashChoice) {
    if ("kind" in item) {
      scheduleGardenCommandReopen((name) => this.edits?.emit?.(name as "edit"));
      return "/garden";
    }
    return `${this.lead}${pickerSelectionResult(item).insertText}\n`;
  }

  lengthOfTextBeforeToBeReplaced(_query?: string) {
    return this.replaceLength;
  }

  show(range: unknown, query: string) {
    super.show(range, query);
    const autoComplete = (globalThis as unknown as { editor?: { autoComplete?: { state?: { match?: unknown[]; index?: number } } } }).editor?.autoComplete;
    if (autoComplete?.state) ensureTyporaActiveIndex(autoComplete.state);
    const container = typoraAutoSuggestElement();
    if (!container) return;
    this.placement = bindGardenPickerPlacement({
      container,
      getAnchorRect: () => caretClientRect(globalThis),
    });
    this.keys?.destroy();
    this.keys = bindGardenPickerKeys({
      container,
      getAutoComplete: () => (globalThis as unknown as { editor?: { autoComplete?: unknown } }).editor?.autoComplete as { state?: { match?: unknown[]; index?: number }; apply?: (item: unknown) => void; isShown?: () => boolean },
    });
  }

  hide() {
    this.keys?.destroy();
    this.keys = undefined;
    this.placement?.destroy();
    this.placement = undefined;
    super.hide();
  }
}
