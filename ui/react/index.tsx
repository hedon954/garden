"use client";

import "./components/layout";
import "./components/inputs";
import "./components/display";
import "./components/chart";
import "./components/media";
import "./components/sandbox";
import { UiRuntime, type UiHost } from "./runtime";
import type { Diagnostic, UiPayload } from "./types";
import { useRuntimeText } from "./lang";
export { RuntimeLangProvider, type RuntimeLang } from "./lang";

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
  const tx = useRuntimeText();
  return (
    <figure className="garden-ui garden-ui-error" lang="en-US" id={id ? `ui-${id}` : undefined}>
      <div className="garden-ui-body">
        <p className="garden-ui-error-title">{tx.errorTitle}</p>
        <ul className="garden-ui-diagnostics">
          {diagnostics.map((item, index) => (
            <li key={index}>
              <code>{item.code}</code>
              <span>{tx.lineN(item.line)}</span>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption>{caption || tx.missingCaption}</figcaption>
    </figure>
  );
}

export function IntentCard({ text, id, onCopyPrompt }: { text: string; id?: string | null; onCopyPrompt?: () => void }) {
  const tx = useRuntimeText();
  return (
    <figure className="garden-ui garden-ui-intent">
      <div className="garden-ui-body">
        <div className="garden-ui-intent-head">
          <strong>{tx.idea}{id ? ` · ${id}` : ""}</strong>
          <span className="garden-ui-badge garden-ui-tone-accent">{tx.uncompiled}</span>
        </div>
        <p className="garden-ui-intent-text">{text}</p>
        {onCopyPrompt ? (
          <button type="button" className="garden-ui-button" onClick={onCopyPrompt}>{tx.copyCompilePrompt}</button>
        ) : null}
      </div>
      <figcaption>{tx.ideaNote}</figcaption>
    </figure>
  );
}
