import { pickerItems, slashQuery, suggestHtml } from "../../../ui/garden/snippets.mjs";

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

const core = (window as unknown as Record<symbol, { EditorSuggest: EditorSuggestCtor }>)[Symbol.for("typora-plugin-core@v2")];

/** `/` offers the `/garden` command. Accepting it opens the thumbnail picker. */
export class GardenSlashSuggest extends core.EditorSuggest {
  triggerText = "/";
  private readonly edits: EditBus | undefined;
  private replaceLength = 1;
  private lead = "";
  private phase: "command" | "components" = "command";

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
    const needle = query.trim().toLowerCase();
    return pickerItems().filter((item) => {
      if (!needle) return true;
      return item.label.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle);
    });
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
      const edits = this.edits;
      // Paste `/garden`, then ask the editor to reopen suggestions on that text.
      setTimeout(() => {
        try {
          edits?.emit?.("edit");
        } catch {
          // The editor's own edit observer still opens the component list.
        }
      }, 30);
      return "/garden";
    }
    return `${this.lead}${item.body}\n`;
  }

  lengthOfTextBeforeToBeReplaced(_query?: string) {
    return this.replaceLength;
  }
}
