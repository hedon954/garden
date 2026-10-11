import rules from "../../ui/prompt/rules.md?raw";
import studio from "../../ui/prompt/studio.md?raw";
import paramBench from "../../ui/prompt/recipes/param-bench.md?raw";
import stepper from "../../ui/prompt/recipes/stepper.md?raw";
import inspectGrid from "../../ui/prompt/recipes/inspect-grid.md?raw";
import compare from "../../ui/prompt/recipes/compare.md?raw";
import trace from "../../ui/prompt/recipes/trace.md?raw";
import converter from "../../ui/prompt/recipes/converter.md?raw";
import plan from "../../ui/prompt/recipes/plan.md?raw";
import dataChart from "../../ui/prompt/recipes/data-chart.md?raw";
import codeWalkthrough from "../../ui/prompt/recipes/code-walkthrough.md?raw";
import { findBlocks, intentHash, setCompiled, splitUiBody } from "../../ui/core/fence.mjs";
import { checkUiBlock } from "../../ui/core/validate.mjs";
import { buildPrompt, RECIPE_FILES } from "../../ui/prompt/build.mjs";

const recipeText: Record<string, string> = {
  "param-bench.md": paramBench,
  "stepper.md": stepper,
  "inspect-grid.md": inspectGrid,
  "compare.md": compare,
  "trace.md": trace,
  "converter.md": converter,
  "plan.md": plan,
  "data-chart.md": dataChart,
  "code-walkthrough.md": codeWalkthrough,
};

export const recipeSources = RECIPE_FILES.map((file) => ({ file, markdown: recipeText[file] ?? "" }));

const systemPrompt = buildPrompt({ rules, recipes: recipeSources.map((recipe) => recipe.markdown), studio });

export type DraftDiagnostic = { code: string; line: number; message: string; severity: "error" | "warning" };
export type DraftUsage = { prompt_tokens: number; completion_tokens: number; total_tokens: number };
export type DraftResult = {
  fence: string | null;
  note: string | null;
  diagnostics: DraftDiagnostic[];
  rounds: number;
  usage: DraftUsage;
  error?: string;
  raw?: string;
};

export function modelConfig() {
  const baseUrl = process.env.UI_MODEL_BASE_URL;
  const apiKey = process.env.UI_MODEL_API_KEY;
  const model = process.env.UI_MODEL_NAME;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl: baseUrl.replace(/\/+$/u, ""), apiKey, model };
}

const hourlyLimit = () => {
  const value = Number(process.env.UI_DRAFT_RATE_LIMIT ?? 60);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 60;
};

// Per process: exact for a single Node admin, approximate across Worker isolates.
const recentDrafts = new Map<string, number[]>();

export function remainingDrafts(login: string) {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const recent = (recentDrafts.get(login) ?? []).filter((time) => time > cutoff);
  recentDrafts.set(login, recent);
  return Math.max(0, hourlyLimit() - recent.length);
}

export function consumeDraft(login: string) {
  if (remainingDrafts(login) <= 0) return false;
  recentDrafts.get(login)?.push(Date.now());
  return true;
}

type Message = { role: "system" | "user" | "assistant"; content: string };

async function complete(messages: Message[]) {
  const config = modelConfig();
  if (!config) throw new Error("后台还没接上模型：请配置 UI_MODEL_BASE_URL、UI_MODEL_API_KEY 和 UI_MODEL_NAME。");
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.2 }),
    signal: AbortSignal.timeout(120_000),
  });
  const result = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: Partial<DraftUsage>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(result.error?.message ?? `模型接口返回 ${response.status}`);
  return { content: result.choices?.[0]?.message?.content ?? "", usage: result.usage ?? {} };
}

function extract(content: string) {
  const fence = findBlocks(content).find((block) => block.lang === "ui" && block.closed);
  const before = fence ? content.slice(0, fence.start) : content;
  const note = /^提醒[:：]\s*(.+)$/mu.exec(before)?.[1]?.trim() ?? null;
  return { fence, note };
}

/**
 * One workbench generation: create from an instruction, or revise the current
 * fence. Diagnostics go back to the model for up to two repair rounds.
 */
export async function draftUiBlock(input: { mode: "create" | "revise"; instruction: string; fence?: string }): Promise<DraftResult> {
  const usage: DraftUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: input.mode === "revise" && input.fence
        ? `当前围栏：\n\n${input.fence}\n\n修改要求：${input.instruction}`
        : input.instruction,
    },
  ];
  let lastContent = "";
  for (let round = 0; round <= 2; round += 1) {
    const reply = await complete(messages);
    lastContent = reply.content;
    usage.prompt_tokens += reply.usage.prompt_tokens ?? 0;
    usage.completion_tokens += reply.usage.completion_tokens ?? 0;
    usage.total_tokens += reply.usage.total_tokens ?? 0;
    const { fence, note } = extract(reply.content);
    if (!fence) {
      if (round === 2) break;
      messages.push({ role: "assistant", content: reply.content }, { role: "user", content: "回复里没有 ui 围栏。请只回复一个完整的 ui 围栏。" });
      continue;
    }
    // lineOffset 1: in the workbench editor the fence starts on line 1.
    const check = checkUiBlock(fence.body, { lineOffset: 1, skipData: true });
    const errors = (check.diagnostics as DraftDiagnostic[]).filter((item) => item.severity === "error");
    const { header } = splitUiBody(fence.body);
    const stamped = typeof header?.intent === "string" ? setCompiled(fence.raw, intentHash(header.intent)) : fence.raw;
    if (!errors.length || round === 2) {
      return { fence: stamped, note, diagnostics: check.diagnostics as DraftDiagnostic[], rounds: round, usage };
    }
    messages.push(
      { role: "assistant", content: reply.content },
      {
        role: "user",
        content: `程序校验发现这些问题：\n${errors.map((item) => `- 第 ${item.line} 行 ${item.code}：${item.message}`).join("\n")}\n请修正后重新给出完整的 ui 围栏，格式不变。`,
      },
    );
  }
  return { fence: null, note: null, diagnostics: [], rounds: 2, usage, error: "模型没有给出 ui 围栏", raw: lastContent };
}
