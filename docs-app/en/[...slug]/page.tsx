import { notFound } from "next/navigation";
import { HandbookDoc, handbookDocMetadata } from "../../../engine-app/components/HandbookView";
import { gardenDocsEn } from "../../../engine-app/lib/content";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../ui/garden/static-params.mjs";
import { renderDocsPlayground } from "../../../docs-app/components/DocsPlaygroundBridge";

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

export default async function DocsEnPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const doc = find(slug);
  if (!doc) {
    if (isStaticPlaceholder(slug)) return null;
    notFound();
  }
  return <HandbookDoc lang="en" doc={doc} renderPlayground={renderDocsPlayground} />;
}
