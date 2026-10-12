"use client";

import { compileUiBlock } from "../core/compile.mjs";
import { PARITY_FIXTURES } from "../parity-fixtures.mjs";
import { UiFigure } from "./index";
import type { UiPayload } from "./types";

function payloadFor(body: string): UiPayload | null {
  return compileUiBlock(body).payload as UiPayload | null;
}

export function ParityInteractions() {
  return (
    <>
      {PARITY_FIXTURES.map((fixture) => {
        const payload = payloadFor(fixture.body);
        return (
          <section id={fixture.id} key={fixture.id} style={{ width: fixture.width, marginBottom: 32 }}>
            {payload ? <UiFigure payload={payload} /> : <p>对照块没有通过检查。</p>}
          </section>
        );
      })}
    </>
  );
}
