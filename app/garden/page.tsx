import { HandbookOverview, handbookLanguages } from "../components/HandbookView";
import { pageAlternates } from "../lib/page-alternates";
import { HANDBOOK_UI } from "../lib/garden-docs-meta";
import { gardenIndexDoc } from "../lib/content";

export const metadata = {
  title: HANDBOOK_UI.zh.name,
  description: gardenIndexDoc?.description ?? "",
  alternates: pageAlternates("/garden", handbookLanguages("zh", "index")),
};

export default function GardenPage() {
  return <HandbookOverview lang="zh" />;
}
