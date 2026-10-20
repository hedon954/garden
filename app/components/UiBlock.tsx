import { readPayload } from "../../ui/core/compile.mjs";
import { IntentCard, UiErrorCard, UiFigure, type Diagnostic, type UiPayload } from "../../ui/react";
import { ui, type UiLang } from "../lib/i18n";

export function UiBlock({ source, lang }: { source: string; lang?: UiLang }) {
  const payload = readPayload(source) as UiPayload | null;
  if (!payload) return <p className="external-embed-error">{ui(lang).uiBlockCorrupt}</p>;
  return <UiFigure payload={payload} />;
}

export function UiErrorBlock({ source }: { source: string }) {
  let value: { id?: string | null; caption?: string; diagnostics?: Diagnostic[] } = {};
  try {
    value = JSON.parse(source);
  } catch {
    value = {};
  }
  return <UiErrorCard id={value.id} caption={value.caption ?? ""} diagnostics={value.diagnostics ?? []} />;
}

export function IntentBlock({ source, id }: { source: string; id?: string | null }) {
  return <IntentCard text={source.trim()} id={id} />;
}
