"use client";

import { useState, type ReactNode } from "react";
import { Desktop, DeviceMobile, SplitHorizontal } from "@phosphor-icons/react";

const LABELS = {
  zh: {
    group: "渲染形态切换",
    both: "双端对照",
    web: "Web 端",
    mobile: "移动端",
    webBadge: "Web 端 · 桌面阅读列 (740px)",
    mobileBadge: "移动端 · 手机视口 (375px)",
  },
  en: {
    group: "Viewport mode",
    both: "Both",
    web: "Web",
    mobile: "Mobile",
    webBadge: "Web · Reading column (740px)",
    mobileBadge: "Mobile · Phone viewport (375px)",
  },
} as const;

export function DocDeviceShowcase({
  title,
  lang = "zh",
  children,
}: {
  title?: string;
  lang?: "zh" | "en";
  children: ReactNode;
}) {
  const t = LABELS[lang];
  const [mode, setMode] = useState<"both" | "web" | "mobile">("both");

  return (
    <section className="doc-showcase" data-mode={mode} aria-label={title || t.both}>
      <header className="doc-showcase-bar">
        <span className="doc-showcase-title">{title || (lang === "en" ? "Live Render" : "实际渲染效果")}</span>
        <div className="doc-showcase-tabs" role="group" aria-label={t.group}>
          <button
            type="button"
            aria-pressed={mode === "both"}
            onClick={() => setMode("both")}
          >
            <SplitHorizontal size={14} aria-hidden="true" />
            <span>{t.both}</span>
          </button>
          <button
            type="button"
            aria-pressed={mode === "web"}
            onClick={() => setMode("web")}
          >
            <Desktop size={14} aria-hidden="true" />
            <span>{t.web}</span>
          </button>
          <button
            type="button"
            aria-pressed={mode === "mobile"}
            onClick={() => setMode("mobile")}
          >
            <DeviceMobile size={14} aria-hidden="true" />
            <span>{t.mobile}</span>
          </button>
        </div>
      </header>

      <div className="doc-showcase-grid">
        {mode !== "mobile" ? (
          <div className="doc-device-card doc-device-card--web">
            <div className="doc-device-head">
              <Desktop size={13} aria-hidden="true" />
              <span>{t.webBadge}</span>
            </div>
            <div className="doc-device-viewport doc-device-viewport--web">
              {children}
            </div>
          </div>
        ) : null}

        {mode !== "web" ? (
          <div className="doc-device-card doc-device-card--mobile">
            <div className="doc-device-head">
              <DeviceMobile size={13} aria-hidden="true" />
              <span>{t.mobileBadge}</span>
            </div>
            <div className="doc-device-phone-wrap">
              <div className="doc-device-viewport doc-device-viewport--mobile">
                {children}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
