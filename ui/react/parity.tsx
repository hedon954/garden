"use client";

import { compileUiBlock } from "../core/compile.mjs";
import { PARITY_FIXTURES, PARITY_FIXTURES_EN } from "../parity-fixtures.mjs";
import { RuntimeLangProvider, UiFigure } from "./index";
import type { UiPayload } from "./types";

function payloadFor(body: string): UiPayload | null {
  return compileUiBlock(body).payload as UiPayload | null;
}

export function ParityInteractions({ lang = "zh" }: { lang?: "zh" | "en" }) {
  const fixtures = lang === "en" ? PARITY_FIXTURES_EN : PARITY_FIXTURES;
  const content = (
    <>
      {fixtures.map((fixture) => {
        const payload = payloadFor(fixture.body);
        return (
          <section id={fixture.id} key={fixture.id} style={{ width: fixture.width, marginBottom: 32 }}>
            {payload ? <UiFigure payload={payload} /> : <p>{lang === "en" ? "Parity block failed validation." : "对照块没有通过检查。"}</p>}
          </section>
        );
      })}
    </>
  );
  return lang === "en" ? <RuntimeLangProvider lang="en">{content}</RuntimeLangProvider> : content;
}
