"use client";

import { marked } from "marked";
import { useEffect, useMemo, useState } from "react";
import { COMPONENTS, GROUPS } from "../core/catalog.mjs";
import { compileUiBlock } from "../core/compile.mjs";
import { DEMOS, demoFence } from "../core/demos.mjs";
import { scanFences } from "../core/fence.mjs";
import { UiFigure } from "./index";
import { parseRecipe, type RecipeSource } from "./recipes";
import type { UiPayload } from "./types";

export type { RecipeSource } from "./recipes";

function payloadOf(fence: string | null): UiPayload | null {
  if (!fence) return null;
  const body = scanFences(fence)[0]?.body;
  if (!body) return null;
  return (compileUiBlock(body).payload as UiPayload | null) ?? null;
}

function StartButton({ fence, onStart }: { fence: string; onStart?: (fence: string) => void }) {
  const [copied, setCopied] = useState(false);
  if (onStart) {
    return <button type="button" className="garden-ui-button garden-ui-tone-accent" onClick={() => onStart(fence)}>用它开始</button>;
  }
  return (
    <button
      type="button"
      className="garden-ui-button"
      onClick={() => {
        void navigator.clipboard?.writeText(fence).then(() => setCopied(true));
      }}
    >
      {copied ? "已复制围栏" : "复制围栏"}
    </button>
  );
}

type Spec = (typeof COMPONENTS)[keyof typeof COMPONENTS] & { parents?: string[]; phase: number };

function PropTable({ spec }: { spec: Spec }) {
  const props = Object.entries(spec.props);
  if (!props.length) return null;
  return (
    <table className="garden-catalog-props">
      <thead>
        <tr><th>属性</th><th>说明</th></tr>
      </thead>
      <tbody>
        {props.map(([prop, propSpec]) => {
          const details = propSpec as { desc?: string; required?: boolean; literal?: boolean; values?: string[]; default?: unknown };
          return (
            <tr key={prop}>
              <td><code>{prop}</code>{details.required ? " · 必填" : ""}{details.literal ? " · 字面量" : ""}</td>
              <td>
                {details.desc}
                {details.values ? `（${details.values.join(" / ")}）` : ""}
                {details.default !== undefined ? `，默认 ${JSON.stringify(details.default)}` : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const CATEGORIES = ["配方", ...GROUPS];

/** Category rail on the left, a grid of name + preview cards on the right. */
export function CatalogPage({ recipes = [], onStart }: { recipes?: RecipeSource[]; onStart?: (fence: string) => void }) {
  const parsedRecipes = useMemo(() => recipes.map(parseRecipe).filter((recipe) => recipe.fence), [recipes]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("展示");
  const [openId, setOpenId] = useState<string | null>(null);
  const normalized = query.trim().toLowerCase();

  const matchesComponent = (name: string) => {
    if (!normalized) return true;
    const spec = COMPONENTS[name as keyof typeof COMPONENTS];
    return [name, spec.summary, ...spec.phrases].some((text) => text.toLowerCase().includes(normalized));
  };
  const recipeMatches = (title: string, intro: string) => !normalized || title.toLowerCase().includes(normalized) || intro.toLowerCase().includes(normalized);

  const cardsFor = (name: string) => {
    if (name === "配方") {
      return parsedRecipes.filter((recipe) => recipeMatches(recipe.title, recipe.intro)).map((recipe) => ({
        id: `recipe-${recipe.file}`,
        title: recipe.title.replace(/^配方：/, ""),
        fence: recipe.fence,
        spec: null as Spec | null,
        intro: recipe.intro,
      }));
    }
    return Object.keys(COMPONENTS)
      .filter((component) => COMPONENTS[component as keyof typeof COMPONENTS].group === name && component in DEMOS && matchesComponent(component))
      .map((component) => ({
        id: `component-${component}`,
        title: component,
        fence: demoFence(component),
        spec: COMPONENTS[component as keyof typeof COMPONENTS] as Spec,
        intro: "",
      }));
  };

  const categories = CATEGORIES.filter((name) => (normalized ? cardsFor(name).length > 0 : name === "配方" ? parsedRecipes.length > 0 : true));
  const activeCategory = categories.includes(category) ? category : categories[0];
  const cards = activeCategory ? cardsFor(activeCategory) : [];

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (id.startsWith("component-")) {
      const spec = COMPONENTS[id.slice("component-".length) as keyof typeof COMPONENTS] as Spec | undefined;
      if (spec?.group) setCategory(spec.group);
    } else if (id === "配方" || id.startsWith("recipe-")) setCategory("配方");
    else if ((CATEGORIES as string[]).includes(decodeURIComponent(id))) setCategory(decodeURIComponent(id));
  }, []);

  const chooseCategory = (name: string) => {
    setCategory(name);
    setOpenId(null);
    window.history.replaceState(null, "", `#${encodeURIComponent(name)}`);
  };

  return (
    <div className="garden-catalog">
      <nav className="garden-catalog-nav" aria-label="大类">
        <input type="search" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索组件" />
        {categories.map((name) => (
          <button key={name} type="button" aria-current={name === activeCategory ? "page" : undefined} onClick={() => chooseCategory(name)}>
            {name}
          </button>
        ))}
      </nav>
      {cards.length ? (
        <div className="garden-catalog-grid">
          {cards.map((card) => {
            const payload = payloadOf(card.fence);
            const open = openId === card.id;
            return (
              <article key={card.id} className="garden-catalog-card" id={card.id}>
                <button type="button" className="garden-catalog-card-name" aria-expanded={open} onClick={() => setOpenId(open ? null : card.id)}>
                  {card.title}
                </button>
                <div className="garden-catalog-well">
                  {payload ? <UiFigure payload={payload} /> : <p className="garden-catalog-empty">没有预览</p>}
                </div>
                {open ? (
                  <div className="garden-catalog-more">
                    {card.spec ? <p>{card.spec.summary}</p> : null}
                    {card.spec?.phrases.length ? <p className="garden-catalog-phrases">可以这样说：{card.spec.phrases.map((phrase) => `“${phrase}”`).join("、")}</p> : null}
                    {card.intro ? <div className="garden-catalog-intro" dangerouslySetInnerHTML={{ __html: marked.parse(card.intro, { async: false }) as string }} /> : null}
                    {card.spec ? <PropTable spec={card.spec} /> : null}
                    {card.fence ? <pre><code>{card.fence}</code></pre> : null}
                    {card.fence && payload ? <StartButton fence={card.fence} onStart={onStart} /> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : <p className="garden-catalog-empty">没有符合的组件。</p>}
    </div>
  );
}
