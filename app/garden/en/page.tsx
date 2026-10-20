import { notFound } from "next/navigation";
import { HandbookOverview, handbookLanguages, handbookOverviewMetadata } from "../../components/HandbookView";
import { pageAlternates } from "../../lib/page-alternates";
import { gardenIndexDocEn } from "../../lib/content";

void pageAlternates;
void handbookLanguages;

export async function generateMetadata() {
  return handbookOverviewMetadata("en", gardenIndexDocEn);
}

export default function GardenEnPage() {
  if (!gardenIndexDocEn) notFound();
  return <HandbookOverview lang="en" />;
}
