import { notFound } from "next/navigation";
import { HandbookOverview, handbookOverviewMetadata } from "../../engine-app/components/HandbookView";
import { gardenIndexDocEn } from "../../engine-app/lib/content";
import { renderDocsPlayground } from "../../docs-app/components/DocsPlaygroundBridge";

export async function generateMetadata() {
  return handbookOverviewMetadata("en", gardenIndexDocEn);
}

export default function DocsEnHomePage() {
  if (!gardenIndexDocEn) notFound();
  return <HandbookOverview lang="en" renderPlayground={renderDocsPlayground} />;
}
