"use client";

import "./components/layout";
import "./components/inputs";
import "./components/display";
import "./components/chart";
import "./components/media";
import "./components/sandbox";
import { UiRuntime, type UiHost } from "./runtime";
import type { Diagnostic, UiPayload } from "./types";

export { UiRuntime } from "./runtime";
export type { UiHost } from "./runtime";
export type { Diagnostic, UiNode, UiPayload } from "./types";

export function UiFigure({ payload, host }: { payload: UiPayload; host?: UiHost }) {
  return (
    <figure className="garden-ui" lang="en-US" id={`ui-${payload.id}`}>
      <UiRuntime payload={payload} host={host} />
      <figcaption>{payload.caption}</figcaption>
    </figure>
  );
}

export function UiErrorCard({ caption, diagnostics, id }: { caption: string; diagnostics: Diagnostic[]; id?: string | null }) {
  return (
    <figure className="garden-ui garden-ui-error" lang="en-US" id={id ? `ui-${id}` : undefined}>
      <div className="garden-ui-body">
        <p className="garden-ui-error-title">这块交互有错误</p>
        <ul className="garden-ui-diagnostics">
          {diagnostics.map((item, index) => (
            <li key={index}>
              <code>{item.code}</code>
              <span>第 {item.line} 行</span>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption>{caption || "（缺少 caption）"}</figcaption>
    </figure>
  );
}

export function IntentCard({ text, id, onCopyPrompt }: { text: string; id?: string | null; onCopyPrompt?: () => void }) {
  return (
    <figure className="garden-ui garden-ui-intent">
      <div className="garden-ui-body">
        <div className="garden-ui-intent-head">
          <strong>想法{id ? ` · ${id}` : ""}</strong>
          <span className="garden-ui-badge garden-ui-tone-accent">未编译</span>
        </div>
        <p className="garden-ui-intent-text">{text}</p>
        {onCopyPrompt ? (
          <button type="button" className="garden-ui-button" onClick={onCopyPrompt}>复制编译提示词</button>
        ) : null}
      </div>
      <figcaption>编译后这里会变成可交互的组件。</figcaption>
    </figure>
  );
}
