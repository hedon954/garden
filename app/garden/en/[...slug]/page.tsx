import { notFound } from "next/navigation";
import { HandbookDoc, handbookDocMetadata } from "../../../components/HandbookView";
import { gardenDocsEn } from "../../../lib/content";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../../ui/garden/static-params.mjs";

const find = (slug: string[]) => gardenDocsEn.find((doc) => doc.path === slug.join("/"));

export function generateStaticParams() {
  return staticParams(
    gardenDocsEn.map((doc) => ({ slug: doc.path.split("/") })),
    { slug: [STATIC_PLACEHOLDER] },
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return handbookDocMetadata("en", find(slug));
}

export default async function GardenEnDocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const doc = find(slug);
  if (!doc) {
    if (isStaticPlaceholder(slug)) return null;
    notFound();
  }
  return <HandbookDoc lang="en" doc={doc} />;
}
