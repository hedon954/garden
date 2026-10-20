"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

const LABELS = {
  zh: { preview: "效果", code: "代码", tabs: "示例视图" },
  en: { preview: "Preview", code: "Code", tabs: "Example view" },
} as const;

// Examples on screen right now; while any is visible on a narrow screen the
// floating contents button steps aside so it never covers code.
const visible = new Set<Element>();
const sync = () => document.documentElement.classList.toggle("ref-demo-in", visible.size > 0);

/** Code on the left and the real block on the right; tabs below 1024px. */
export function RefDemo({ children, lang = "zh" }: { children?: ReactNode; lang?: "zh" | "en" }) {
  const t = LABELS[lang];
  const [tab, setTab] = useState<"v" | "c">("v");
  const ref = useRef<HTMLDivElement>(null);
  const [code, preview] = Children.toArray(children).filter(isValidElement);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      sync();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      visible.delete(el);
      sync();
    };
  }, []);

  const tabButton = (id: "v" | "c", label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} data-t={id} onClick={() => setTab(id)}>
      {label}
    </button>
  );

  return (
    <div className="ref-demo" ref={ref} data-tab={tab}>
      <div className="ref-tabs" role="tablist" aria-label={t.tabs}>
        {tabButton("v", t.preview)}
        {tabButton("c", t.code)}
      </div>
      <div className="ref-pane" data-p="c" data-off={tab !== "c" ? "" : undefined}>
        <p className="ref-pane-h">{t.code}</p>
        {code}
      </div>
      <div className="ref-pane" data-p="v" data-off={tab !== "v" ? "" : undefined}>
        <p className="ref-pane-h">{t.preview}</p>
        {preview}
      </div>
    </div>
  );
}
