import assert from "node:assert/strict";
import test from "node:test";
import { DEMOS, demoFence } from "../ui/core/demos.mjs";
import { scanFences } from "../ui/core/fence.mjs";
import { previewCompose } from "../ui/compose/preview.mjs";

for (const [name, demo] of Object.entries(DEMOS)) {
  test(`public ${name} demo uses Compose and supplies a compiled interactive preview`, () => {
    const source = demoFence(name);
    assert.match(source, /^```garden compose #/u);
    const [fence] = scanFences(source);
    const preview = previewCompose(fence.body, { info: `${fence.lang} ${fence.info}` });
    assert.ok(preview.payload, JSON.stringify(preview.diagnostics));
    assert.equal(preview.payload.caption, demo.caption);
    assert.equal(preview.block.payload, preview.payload);
    assert.ok(preview.html.trim());
  });
}
