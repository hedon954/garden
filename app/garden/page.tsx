import { HandbookOverview, handbookLanguages } from "../components/HandbookView";
import { pageAlternates } from "../lib/page-alternates";
import { HANDBOOK_UI } from "../lib/garden-docs-meta";
import { gardenIndexDoc } from "../lib/content";
import { siteLang } from "../lib/i18n";

export const metadata = {
  title: HANDBOOK_UI[siteLang].name,
  description: gardenIndexDoc?.description ?? "",
  alternates: pageAlternates("/garden", handbookLanguages("zh", "index")),
};

export default function GardenPage() {
  return <HandbookOverview lang={siteLang} />;
}
