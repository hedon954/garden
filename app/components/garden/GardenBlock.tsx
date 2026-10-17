"use client";

import { readGardenPayload } from "../../lib/remark-garden.mjs";
import {
  GardenCard,
  GardenChart,
  GardenCompare,
  GardenFigure,
  GardenHtml,
  GardenIdea,
  GardenInteractive,
  GardenLegacy,
  GardenStat,
  GardenTimeline,
  GardenUnknown,
} from "./blocks";

export function GardenBlock({ dataPayload }: { dataPayload?: string }) {
  const block = readGardenPayload(dataPayload);
  if (!block) return null;
  if (block.legacy && block.suggestion) return <GardenLegacy suggestion={String(block.suggestion)} />;
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
    case "figure":
      return <GardenFigure props={props}>{String(block.children ?? "")}</GardenFigure>;
    case "html":
      return <GardenHtml props={props}>{String(block.children ?? "")}</GardenHtml>;
    case "interactive":
      return <GardenInteractive block={{ id: block.id, props, children: block.children }} />;
    default:
      return <GardenUnknown name={String(block.name)} />;
  }
}
