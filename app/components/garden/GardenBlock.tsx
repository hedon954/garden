"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { useUiLang } from "../UiLang";
import { parseCompose } from "../../../ui/compose/index.mjs";
import { renderCompose } from "../../../ui/compose/render.mjs";
import { readGardenPayload } from "../../lib/remark-garden.mjs";
import {
  GardenCard,
  GardenChart,
  GardenCompare,
  GardenIdea,
  GardenInteractive,
  GardenStat,
  GardenTimeline,
  GardenUnknown,
} from "./blocks";
import { GardenFile } from "./GardenFile";
import { GardenChoice, GardenList, GardenRelations } from "./patterns";

const composeComponents = {
  "garden-block": (nested: {dataPayload?:string;"data-payload"?:string}) => <GardenBlock dataPayload={nested.dataPayload??nested["data-payload"]}/>,
};

export function GardenBlock({ dataPayload }: { dataPayload?: string }) {
  const lang = useUiLang();
  const block = readGardenPayload(dataPayload);
  if (!block) return null;
  if (!block.name) return <GardenIdea text={String(block.idea || block.children || "")} />;
  if (block.error) return <GardenUnknown name={String(block.name)} />;
  const props = (block.props ?? {}) as Record<string, unknown>;
  switch (block.name) {
    case "card":
      return <GardenCard props={props} />;
    case "stat":
      return <GardenStat props={props} />;
    case "compare":
      return <GardenCompare props={props} />;
    case "timeline":
      return <GardenTimeline props={props} />;
    case "chart":
      return <GardenChart props={props} />;
    case "compose":
      if (block.error?.code === "compose-uncompiled") return <GardenIdea text={String(block.idea || block.children || "")} />;
      if (block.error) return <GardenUnknown name="compose" />;
      if (block.mode === "play") {
        // DIL play: prefer lowered uiSource from ui/compose/dil.mjs. children alone is TEMP legacy.
        return (
          <GardenInteractive
            renderScene={source => { const parsed=parseCompose(source); return parsed.ok ? <GardenBlock dataPayload={encodeURIComponent(JSON.stringify({name:"compose",props:{...parsed.doc,frame:"none"}}))}/> : null; }}
            block={{
              id: block.id,
              props,
              children: String(block.children ?? ""),
              uiSource: typeof block.uiSource === "string" ? block.uiSource : undefined,
            }}
          />
        );
      }
      return <div className="g-compose-host"><ReactMarkdown rehypePlugins={[rehypeRaw]} components={composeComponents}>{renderCompose(props)}</ReactMarkdown></div>;
    case "file":
      // Post bodies render file cards on the server (MarkdownArticle); this path has no Markdown preview.
      return <GardenFile props={props} lang={lang} />;
    case "relations":
      return <GardenRelations props={props} />;
    case "list":
      return <GardenList props={props} />;
    case "choice":
      return <GardenChoice props={props} />;
    default:
      return <GardenUnknown name={String(block.name)} />;
  }
}
