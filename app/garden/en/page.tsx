import { notFound } from "next/navigation";
import { HandbookOverview, handbookLanguages } from "../../components/HandbookView";
import { pageAlternates } from "../../lib/page-alternates";
import { HANDBOOK_UI } from "../../lib/garden-docs-meta";
import { gardenIndexDocEn } from "../../lib/content";

export const metadata = {
  title: HANDBOOK_UI.en.name,
  description: gardenIndexDocEn?.description ?? "",
  alternates: pageAlternates("/garden/en", handbookLanguages("en", "index")),
};

export default function GardenEnPage() {
  if (!gardenIndexDocEn) notFound();
  return <HandbookOverview lang="en" />;
}
