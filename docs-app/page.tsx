import { HandbookOverview, handbookOverviewMetadata } from "../engine-app/components/HandbookView";
import { gardenIndexDoc } from "../engine-app/lib/content";
import { renderDocsPlayground } from "../docs-app/components/DocsPlaygroundBridge";

export async function generateMetadata() {
  return handbookOverviewMetadata("zh", gardenIndexDoc);
}

export default function DocsHomePage() {
  return <HandbookOverview lang="zh" renderPlayground={renderDocsPlayground} />;
}
