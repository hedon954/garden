import { notFound } from "next/navigation";
import { PageIntro } from "../../../components/PageIntro";
import { ThoughtFeed, thoughtsPageCount, thoughtsPageSize } from "../../../components/ThoughtFeed";
import { getPublishedThoughts } from "../../../lib/public-thoughts";
import { ui } from "../../../lib/i18n";
import { pageAlternates } from "../../../lib/page-alternates";
import { siteConfig } from "../../../site.config";
import { extraPages, pagePath } from "../../../../ui/garden/paging.mjs";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../../ui/garden/static-params.mjs";

export function generateStaticParams() {
  return staticParams(
    extraPages(getPublishedThoughts().length, thoughtsPageSize()).map((page: number) => ({ n: String(page) })),
    { n: STATIC_PLACEHOLDER },
  );
}

const pageNumber = (value: string) => (/^\d+$/u.test(value) ? Number(value) : NaN);

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = pageNumber(n);
  if (!(page >= 2 && page <= thoughtsPageCount())) return {};
  return {
    title: `${siteConfig.pages.thoughts.title} · ${ui().pageOf(page, thoughtsPageCount())}`,
    description: siteConfig.pages.thoughts.subtitle || siteConfig.description,
    alternates: pageAlternates(pagePath("/thoughts", page)),
  };
}

export default async function ThoughtsPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = pageNumber(n);
  if (!(page >= 2 && page <= thoughtsPageCount())) {
    if (isStaticPlaceholder(n)) return null;
    notFound();
  }
  return (
    <main className="page-shell thoughts-page">
      <PageIntro eyebrow={ui().thoughtsEyebrow} title={siteConfig.pages.thoughts.title} subtitle={siteConfig.pages.thoughts.subtitle} />
      <ThoughtFeed page={page} />
    </main>
  );
}
