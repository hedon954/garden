"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { mountFeatureTitle } from "../../ui/garden/feature-title-fit.mjs";
import runtimeSource from "../../ui/garden/feature-title-fit.mjs?raw";

// Preserve one authored runtime across SSR/browser builds; function.toString()
// would be changed independently by server and client optimizers.
const FEATURE_TITLE_BOOT = `(()=>{${runtimeSource.replace(/^export /gm, "")}\nmountFeatureTitle(document.currentScript.parentElement);})();`;

type FeaturedTitleProps = { title: string; href: string; description?: string };

export function FeaturedTitle({ title, href, description }: FeaturedTitleProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => mountFeatureTitle(heading.current?.parentElement), [title, href, description]);
  return <>
    <h2 id="ft" ref={heading} data-feature-title=""><Link href={href}>{title}</Link></h2>
    {description ? <p data-feature-summary="">{description}</p> : null}
    <style data-feature-title-rules="">{""}</style>
    <script data-feature-title-boot="" dangerouslySetInnerHTML={{ __html: FEATURE_TITLE_BOOT }} />
  </>;
}
