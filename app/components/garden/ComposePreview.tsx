"use client";

import { UiLangProvider } from "../UiLang";
import { GardenBlock } from "./GardenBlock";

/** Site/editor host adapter; the portable UI package only receives this callback. */
export function renderComposePreview(block: unknown, lang?: "zh" | "en") {
  return <UiLangProvider lang={lang}><GardenBlock dataPayload={encodeURIComponent(JSON.stringify(block))} /></UiLangProvider>;
}
