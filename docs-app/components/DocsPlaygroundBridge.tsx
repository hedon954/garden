import { linkAssets } from "@garden/generated-content";
import type { UiLang } from "../../app/lib/i18n";
import { DocLivePlayground } from "./DocLivePlayground";

export function renderDocsPlayground(specJson: string, lang?: UiLang) {
  return (
    <DocLivePlayground
      specJson={specJson}
      lang={lang === "en" ? "en" : "zh"}
      linkAssets={linkAssets}
    />
  );
}
