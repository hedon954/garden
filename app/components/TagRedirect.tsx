"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ARTICLE_TAG_LIST, TAG_PARAM, selectedTags, tagFilterHref } from "../lib/tag-filter";

/** Old `/tags?t=X` links open the same filter on `/blog/?t=X`. */
export function TagRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const tags = selectedTags(params.getAll(TAG_PARAM));
  const target = tags.length ? tagFilterHref(tags, ARTICLE_TAG_LIST) : "";
  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);
  return null;
}
