"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { buildFixPrompt } from "../../ui/core/fix-prompt.mjs";
import { CatalogPage, type RecipeSource } from "../../ui/react/CatalogPage";
import { EVALS_STORAGE_KEY as EVALS_KEY, STUDIO_START_KEY } from "./ui-studio-keys";

export function AdminCatalog({ recipes }: { recipes: RecipeSource[] }) {
  return (
    <section className="admin-panel ui-admin-catalog">
      <CatalogPage
        recipes={recipes}
        onStart={(fence) => {
          window.localStorage.setItem(STUDIO_START_KEY, fence);
          window.location.assign("/admin/ui");
        }}
      />
    </section>
  );
}

type Block = {
  lang: string;
  id: string | null;
  status: "uncompiled" | "stale" | "error" | "ok";
  startLine: number;
  endLine: number;
  hash: string;
  intentHash: string | null;
  intent: string | null;
  caption: string | null;
  section: string | null;
  diagnostics: Array<{ code: string; line: number; message: string; severity: string }>;
  raw: string;
};
type FileBlocks = { path: string; title: string | null; draft: boolean; blocks: Block[] };

const STATUS_LABELS: Record<Block["status"], string> = { uncompiled: "未编译", stale: "过期", error: "有错", ok: "正常" };

const publicPath = (path: string) => {
  const posts = /^content\/posts\/(.+)\.md$/u.exec(path);
  if (posts) return `/blog/${posts[1]}`;
  const thoughts = /^content\/thoughts\/(.+)\.md$/u.exec(path);
  return thoughts ? `/thoughts/${thoughts[1]}` : null;
};

export function AdminBlocks({ siteUrl }: { siteUrl: string }) {
  const [files, setFiles] = useState<FileBlocks[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todo" | "all" | Block["status"]>("todo");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/ui/blocks")
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!active) return;
        if (ok) setFiles(body.files);
        else setError(body.error ?? "读取失败。");
      })
      .catch(() => {
        if (active) setError("读取失败。");
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = (block: Block) =>
    block.lang !== "widget" && (filter === "all" || (filter === "todo" ? block.status !== "ok" : block.status === filter));

  const copyPrompt = async (file: FileBlocks, block: Block) => {
    const prompt = buildFixPrompt([{ file: file.path, block, diagnostics: block.diagnostics.filter((item) => item.severity === "error") }]);
    await navigator.clipboard.writeText(prompt);
    setCopied(`${file.path}:${block.startLine}`);
  };

  const counts = { uncompiled: 0, stale: 0, error: 0, ok: 0 };
  for (const file of files ?? []) for (const block of file.blocks) if (block.lang !== "widget") counts[block.status] += 1;

  return (
    <section className="admin-panel ui-admin-blocks">
      <div className="admin-panel-heading">
        <div><span>交互块</span><h2>所有稿件里的 intent 和 ui 块</h2></div>
      </div>
      <p className="ui-studio-meta">看到的是仓库里已推送的内容（含草稿）；本地没推的改动看不到。</p>
      <div className="ui-studio-switch" role="group" aria-label="按状态筛选">
        {(["todo", "uncompiled", "stale", "error", "ok", "all"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value === "todo" ? `需要处理 ${counts.uncompiled + counts.stale + counts.error}` : value === "all" ? "全部" : `${STATUS_LABELS[value]} ${counts[value]}`}
          </button>
        ))}
      </div>
      {error ? <p className="ui-studio-message ui-studio-message-error">{error}</p> : null}
      {!files && !error ? <p className="ui-studio-meta">正在扫描仓库…</p> : null}
      {files?.map((file) => {
        const blocks = file.blocks.filter(visible);
        if (!blocks.length) return null;
        const preview = `/admin/preview/${file.path.replace(/^content\//u, "").replace(/\.md$/u, "")}`;
        const live = !file.draft ? publicPath(file.path) : null;
        return (
          <article key={file.path} className="ui-admin-file">
            <h3>{file.title ?? file.path}{file.draft ? <span className="admin-status draft">草稿</span> : null}</h3>
            <p className="ui-studio-meta">{file.path}</p>
            <table className="ui-admin-table">
              <thead>
                <tr><th>块</th><th>状态</th><th>说明</th><th>操作</th></tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.startLine}>
                    <td>{block.lang === "intent" ? "想法" : "ui"} · {block.id ?? `第 ${block.startLine} 行`}</td>
                    <td><span className={`ui-admin-status ui-admin-status-${block.status}`}>{STATUS_LABELS[block.status]}</span></td>
                    <td>{block.caption ?? block.intent?.split("\n")[0] ?? ""}{block.diagnostics.length ? `（${block.diagnostics.length} 条诊断）` : ""}</td>
                    <td className="ui-admin-actions">
                      <Link href={`/admin/ui?post=${encodeURIComponent(file.path)}&line=${block.startLine}`}>在工作台打开</Link>
                      {block.status !== "ok" ? (
                        <button type="button" onClick={() => copyPrompt(file, block)}>
                          {copied === `${file.path}:${block.startLine}` ? "已复制" : "复制修复提示词"}
                        </button>
                      ) : null}
                      <Link href={`${preview}${block.id ? `#ui-${block.id}` : ""}`}>草稿预览</Link>
                      {live ? <a href={`${siteUrl}${live}${block.id ? `#ui-${block.id}` : ""}`} target="_blank" rel="noreferrer">公开页面</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        );
      })}
    </section>
  );
}

type EvalCase = { id: string; intent: string; expect: { components?: string[]; assert?: boolean; note?: boolean } };
type EvalResult = {
  id: string;
  ok: boolean;
  rounds: number;
  components: boolean;
  assert: boolean;
  note: boolean;
  tokens: number;
  ms: number;
  error?: string;
};

function summarize(results: EvalResult[]) {
  const total = results.length || 1;
  return {
    pass: results.filter((item) => item.ok).length,
    total: results.length,
    rate: Math.round((results.filter((item) => item.ok).length / total) * 100),
    rounds: (results.reduce((sum, item) => sum + item.rounds, 0) / total).toFixed(2),
    tokens: results.reduce((sum, item) => sum + item.tokens, 0),
  };
}

export function AdminEvals({ cases, configured }: { cases: EvalCase[]; configured: boolean }) {
  const [results, setResults] = useState<EvalResult[]>([]);
  const [running, setRunning] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  // The baseline is the run saved before this page opened; only shown after mount to keep hydration stable.
  const [baselineRaw] = useState(() => (typeof window === "undefined" ? null : window.localStorage.getItem(EVALS_KEY)));
  const previous = useMemo<EvalResult[] | null>(() => {
    if (!mounted) return null;
    try {
      return baselineRaw ? JSON.parse(baselineRaw) : null;
    } catch {
      return null;
    }
  }, [baselineRaw, mounted]);

  async function run() {
    setRunning(true);
    const collected: EvalResult[] = [];
    setResults([]);
    for (const item of cases) {
      const started = performance.now();
      try {
        const response = await fetch("/api/admin/ui/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "create", instruction: item.intent }),
        });
        const body = (await response.json()) as { fence?: string | null; note?: string | null; rounds?: number; diagnostics?: Array<{ severity: string }>; usage?: { total_tokens?: number }; error?: string };
        const fence = body.fence ?? "";
        const used = new Set([...fence.matchAll(/<([A-Z][A-Za-z]*)\b/gu)].map((match) => match[1]));
        const valid = response.ok && Boolean(body.fence) && !(body.diagnostics ?? []).some((entry) => entry.severity === "error");
        const components = (item.expect.components ?? []).every((name) => used.has(name));
        const assert = !item.expect.assert || /\nexpect:/u.test(fence);
        const note = !item.expect.note || Boolean(body.note);
        collected.push({
          id: item.id,
          ok: valid && components && assert && note,
          rounds: body.rounds ?? 0,
          components,
          assert,
          note,
          tokens: body.usage?.total_tokens ?? 0,
          ms: Math.round(performance.now() - started),
          error: response.ok ? undefined : body.error,
        });
      } catch (error) {
        collected.push({ id: item.id, ok: false, rounds: 0, components: false, assert: false, note: false, tokens: 0, ms: Math.round(performance.now() - started), error: error instanceof Error ? error.message : "失败" });
      }
      setResults([...collected]);
    }
    window.localStorage.setItem(EVALS_KEY, JSON.stringify(collected));
    setRunning(false);
  }

  const current = summarize(results);
  const before = previous ? summarize(previous) : null;
  return (
    <section className="admin-panel ui-admin-evals">
      <div className="admin-panel-heading">
        <div><span>模型自检</span><h2>用 {cases.length} 段原话给当前模型和提示词打分</h2></div>
      </div>
      <p className="ui-studio-meta">逐条调用工作台的生成接口，共 {cases.length} 次，计入每小时限额。换模型或改提示词后跑一次。</p>
      <div className="admin-actions">
        <button type="button" className="admin-primary-button" disabled={!configured || running} onClick={run}>{running ? `正在跑 ${results.length}/${cases.length}…` : "开始自检"}</button>
      </div>
      {!configured ? <p className="ui-studio-message ui-studio-message-error">后台还没接上模型。</p> : null}
      {results.length ? (
        <p className="ui-studio-meta">
          本次：通过 {current.pass}/{current.total}（{current.rate}%），平均修复 {current.rounds} 轮，共 {current.tokens} token。
          {before ? ` 上次：通过 ${before.pass}/${before.total}（${before.rate}%），平均修复 ${before.rounds} 轮，共 ${before.tokens} token。` : ""}
        </p>
      ) : before ? <p className="ui-studio-meta">上次：通过 {before.pass}/{before.total}（{before.rate}%），平均修复 {before.rounds} 轮，共 {before.tokens} token。</p> : null}
      <table className="ui-admin-table">
        <thead>
          <tr><th>样例</th><th>结果</th><th>修复轮数</th><th>组件</th><th>expect</th><th>提醒</th><th>token</th><th>耗时</th></tr>
        </thead>
        <tbody>
          {cases.map((item) => {
            const result = results.find((entry) => entry.id === item.id);
            return (
              <tr key={item.id}>
                <td title={item.intent}>{item.id}</td>
                <td>{result ? (result.ok ? "通过" : result.error ?? "未通过") : "—"}</td>
                <td>{result ? result.rounds : "—"}</td>
                <td>{result ? (result.components ? "✓" : `缺 ${(item.expect.components ?? []).join("、")}`) : (item.expect.components ?? []).join("、")}</td>
                <td>{item.expect.assert ? (result ? (result.assert ? "✓" : "缺") : "要") : "—"}</td>
                <td>{item.expect.note ? (result ? (result.note ? "✓" : "缺") : "要") : "—"}</td>
                <td>{result ? result.tokens : "—"}</td>
                <td>{result ? `${(result.ms / 1000).toFixed(1)}s` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
