"use client";

import { marked } from "marked";
import { useMemo, useState, useSyncExternalStore } from "react";
import { COMPONENTS, GROUPS } from "../core/catalog.mjs";
import { CATALOG, offeredGardenNames } from "../garden/catalog.mjs";
import { previewCompose } from "../compose/preview.mjs";
import { AUTHOR_PLAY_TAGS } from "../compose/dil.mjs";
import { GardenBlock } from "../../app/components/garden/GardenBlock";
import { DEMOS, demoFence } from "../core/demos.mjs";
import { scanFences } from "../core/fence.mjs";
import { parseRecipe, type RecipeSource } from "./recipes";

export type { RecipeSource } from "./recipes";

const AUTHOR_NAMES = Object.fromEntries(Object.entries(AUTHOR_PLAY_TAGS).map(([author, internal]) => [internal, author]));

function previewOf(fence: string | null) {
  const parsed = fence ? scanFences(fence)[0] : null;
  return parsed ? previewCompose(parsed.body, {info: `${parsed.lang} ${parsed.info}`}) : null;
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

const hashListeners = new Set<() => void>();

function subscribeCatalogHash(onStoreChange: () => void) {
  hashListeners.add(onStoreChange);
  window.addEventListener("hashchange", onStoreChange);
  return () => {
    hashListeners.delete(onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
  };
}

function categoryFromHash(hash: string): string {
  const id = hash.replace(/^#/, "");
  if (id.startsWith("component-")) {
    const spec = COMPONENTS[AUTHOR_PLAY_TAGS[id.slice("component-".length) as keyof typeof AUTHOR_PLAY_TAGS] as keyof typeof COMPONENTS] as Spec | undefined;
    if (spec?.group) return spec.group;
  } else if (id === "配方" || id.startsWith("recipe-")) return "配方";
  else {
    try {
      const decoded = decodeURIComponent(id);
      if ((CATEGORIES as string[]).includes(decoded)) return decoded;
    } catch {
      // A malformed hash stays on the default category.
    }
  }
  return "展示";
}

function replaceCatalogHash(name: string) {
  window.history.replaceState(null, "", `#${encodeURIComponent(name)}`);
  for (const listener of hashListeners) listener();
}

/** Category rail on the left, a grid of name + preview cards on the right. */
export function CatalogPage({ recipes = [], onStart }: { recipes?: RecipeSource[]; onStart?: (fence: string) => void }) {
  const parsedRecipes = useMemo(() => recipes.map(parseRecipe).filter((recipe) => recipe.fence), [recipes]);
  const [query, setQuery] = useState("");
  const hash = useSyncExternalStore(subscribeCatalogHash, () => window.location.hash, () => "");
  const category = categoryFromHash(hash);
  const [openId, setOpenId] = useState<string | null>(null);
  const normalized = query.trim().toLowerCase();

  const matchesComponent = (name: string) => {
    if (!normalized) return true;
    const spec = COMPONENTS[name as keyof typeof COMPONENTS];
    return [AUTHOR_NAMES[name] ?? name, spec.summary, ...spec.phrases].some((text) => text.toLowerCase().includes(normalized));
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
      .filter((component) => COMPONENTS[component as keyof typeof COMPONENTS].group === name && component in DEMOS && component in AUTHOR_NAMES && matchesComponent(component))
      .map((component) => ({
        id: `component-${AUTHOR_NAMES[component]}`,
        title: AUTHOR_NAMES[component],
        fence: demoFence(component),
        spec: COMPONENTS[component as keyof typeof COMPONENTS] as Spec,
        intro: "",
      }));
  };

  const categories = CATEGORIES.filter((name) => (normalized ? cardsFor(name).length > 0 : name === "配方" ? parsedRecipes.length > 0 : true));
  const activeCategory = categories.includes(category) ? category : categories[0];
  const cards = activeCategory ? cardsFor(activeCategory) : [];

  const chooseCategory = (name: string) => {
    setOpenId(null);
    replaceCatalogHash(name);
  };

  return (
    <div className="garden-catalog">
      <section className="garden-author-catalog">
        <h2>写作块</h2>
        <p>文章组件只使用 <code>garden compose</code>。在同一个入口内组合正文、图形、资源和交互；下方的组件示例也使用同一个 Compose 入口。</p>
        <ul>
          {offeredGardenNames().map((name) => {
            const spec = CATALOG[name as keyof typeof CATALOG];
            return <li key={name}><code>garden {name}</code> · {spec.label}。{spec.when}</li>;
          })}
        </ul>
      </section>
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
            const preview = previewOf(card.fence);
            const open = openId === card.id;
            return (
              <article key={card.id} className="garden-catalog-card" id={card.id}>
                <button type="button" className="garden-catalog-card-name" aria-expanded={open} onClick={() => setOpenId(open ? null : card.id)}>
                  {card.title}
                </button>
                <div className="garden-catalog-well">
                  {preview?.block ? <GardenBlock dataPayload={encodeURIComponent(JSON.stringify(preview.block))} /> : <p className="garden-catalog-empty">{preview?.diagnostics.map((item: {message: string}) => item.message).join("；") || "没有预览"}</p>}
                </div>
                {open ? (
                  <div className="garden-catalog-more">
                    {card.spec ? <p>{card.spec.summary}</p> : null}
                    {card.spec?.phrases.length ? <p className="garden-catalog-phrases">可以这样说：{card.spec.phrases.map((phrase) => `“${phrase}”`).join("、")}</p> : null}
                    {card.intro ? <div className="garden-catalog-intro" dangerouslySetInnerHTML={{ __html: marked.parse(card.intro, { async: false }) as string }} /> : null}
                    {card.spec ? <PropTable spec={card.spec} /> : null}
                    {card.fence ? <pre><code>{card.fence}</code></pre> : null}
                    {card.fence && preview?.block ? <StartButton fence={card.fence} onStart={onStart} /> : null}
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
