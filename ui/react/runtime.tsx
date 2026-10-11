"use client";

import { createContext, createElement, Fragment, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createBudget, evaluate } from "../core/expr.mjs";
import { formatValue } from "../core/format.mjs";
import { collectDecls, computeScope, defaultStateValues, lookupFrom } from "../core/state.mjs";
import type { Env, Expr, Lookup, Prop, UiNode, UiPayload } from "./types";

type Decls = ReturnType<typeof collectDecls>;

export type Runtime = {
  blockId: string;
  root: UiNode;
  decls: Decls;
  data: Record<string, unknown>;
  defaults: Record<string, unknown>;
  state: Record<string, unknown>;
  scope: Record<string, unknown>;
  sliders: Map<string, UiNode>;
  setState: (patch: Record<string, unknown>) => void;
  reset: () => void;
  scopeFor: (state: Record<string, unknown>) => Record<string, unknown>;
};

const RuntimeContext = createContext<Runtime | null>(null);

export function useRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("Garden UI component outside UiRuntime");
  return runtime;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function lookupFor(runtime: Runtime, env: Env, scope = runtime.scope): Lookup {
  return lookupFrom(...env.locals, scope) as Lookup;
}

export function evalExpr(expression: Expr, lookup: Lookup): unknown {
  try {
    return evaluate(expression, lookup, createBudget(200000));
  } catch {
    return undefined;
  }
}

export function propValue(runtime: Runtime, node: UiNode, name: string, env: Env, scope?: Record<string, unknown>): unknown {
  const prop = node.p?.[name];
  if (!prop) return undefined;
  if (prop.k === "lit") return prop.v;
  return evalExpr(prop.e, lookupFor(runtime, env, scope));
}

export function rowValue(runtime: Runtime, prop: Prop | undefined, row: unknown, env: Env): unknown {
  if (!prop) return undefined;
  if (prop.k === "lit") return prop.v;
  return evalExpr(prop.e, lookupFrom(isPlainObject(row) ? row : {}, ...env.locals, runtime.scope) as Lookup);
}

export const asString = (value: unknown, fallback = ""): string =>
  value === undefined || value === null ? fallback : typeof value === "string" ? value : formatValue(value);

export const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** If / Each expansion shared by components that count or iterate children. */
export function expandChildren(runtime: Runtime, children: UiNode[] | undefined, env: Env): Array<{ node: UiNode; env: Env }> {
  const output: Array<{ node: UiNode; env: Env }> = [];
  for (const child of children ?? []) {
    if (child.t !== "el") continue;
    if (child.n === "If") {
      if (propValue(runtime, child, "test", env)) output.push(...expandChildren(runtime, child.c, env));
    } else if (child.n === "Each") {
      const items = propValue(runtime, child, "of", env);
      if (!Array.isArray(items)) continue;
      const asName = child.p?.as?.k === "lit" ? String(child.p.as.v) : "item";
      const indexName = child.p?.index?.k === "lit" ? String(child.p.index.v) : null;
      items.slice(0, 200).forEach((item, index) => {
        const local: Record<string, unknown> = { [asName]: item };
        if (indexName) local[indexName] = index;
        output.push(...expandChildren(runtime, child.c, { locals: [local, ...env.locals] }));
      });
    } else {
      output.push({ node: child, env });
    }
  }
  return output;
}

type ComponentRenderer = (props: { node: UiNode; env: Env }) => ReactNode;
const registry = new Map<string, ComponentRenderer>();

export function registerComponents(entries: Record<string, ComponentRenderer>) {
  for (const [name, component] of Object.entries(entries)) registry.set(name, component);
}

function Interpolation({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const value = node.e ? evalExpr(node.e, lookupFor(runtime, env)) : undefined;
  return <span className="garden-ui-value">{formatValue(value)}</span>;
}

const hasInterpolation = (nodes: UiNode[] | undefined): boolean =>
  (nodes ?? []).some((node) => node.t === "x" || hasInterpolation(node.c));

const safeHref = (href: string) => (/^(?:https:\/\/|\.{0,2}\/|#)/u.test(href) || /^[\w\u3400-\u9fff./-]+$/u.test(href) ? href : "#");

export function RenderNode({ node, env }: { node: UiNode; env: Env }): ReactNode {
  const runtime = useRuntime();
  switch (node.t) {
    case "text":
      return node.v ?? "";
    case "x":
      return <Interpolation node={node} env={env} />;
    case "p":
      return (
        <p aria-live={hasInterpolation(node.c) ? "polite" : undefined}>
          <RenderNodes nodes={node.c} env={env} />
        </p>
      );
    case "strong":
      return <strong><RenderNodes nodes={node.c} env={env} /></strong>;
    case "em":
      return <em><RenderNodes nodes={node.c} env={env} /></em>;
    case "code":
      return <code>{node.v}</code>;
    case "br":
      return <br />;
    case "hr":
      return <hr />;
    case "link": {
      const href = safeHref(node.u ?? "");
      const external = href.startsWith("https://");
      return (
        <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <RenderNodes nodes={node.c} env={env} />
        </a>
      );
    }
    case "list": {
      const Tag = node.o ? "ol" : "ul";
      return (
        <Tag start={node.o && node.s && node.s !== 1 ? node.s : undefined}>
          {(node.c ?? []).map((item, index) => (
            <li key={index}><RenderNodes nodes={item.c} env={env} /></li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return <blockquote><RenderNodes nodes={node.c} env={env} /></blockquote>;
    case "el": {
      if (node.n === "State" || node.n === "Let" || node.n === "Data") return null;
      if (node.n === "If" || node.n === "Each") {
        return (
          <>
            {expandChildren(runtime, [node], env).map((item, index) => (
              <RenderNode key={index} node={item.node} env={item.env} />
            ))}
          </>
        );
      }
      const component = node.n ? registry.get(node.n) : undefined;
      if (!component) return <span className="garden-ui-unknown">预览需要更新 Garden 插件（不认识 &lt;{node.n}&gt;）</span>;
      // Registry entries are module-level functions, so their identity is stable across renders.
      return createElement(component, { node, env });
    }
    default:
      return null;
  }
}

export function RenderNodes({ nodes, env }: { nodes: UiNode[] | undefined; env: Env }) {
  return (
    <>
      {(nodes ?? []).map((node, index) => (
        <Fragment key={index}>
          <RenderNode node={node} env={env} />
        </Fragment>
      ))}
    </>
  );
}

/** Finds the node that binds a state, so inputs and buttons can clamp values. */
function collectSliders(root: UiNode) {
  const sliders = new Map<string, UiNode>();
  const visit = (node: UiNode) => {
    if (node.t === "el" && node.n === "Slider" && node.p?.bind?.k === "lit") sliders.set(String(node.p.bind.v), node);
    node.c?.forEach(visit);
  };
  visit(root);
  return sliders;
}

const EMPTY_DATA: Record<string, unknown> = {};

/** Keeps values the reader already chose when the block is edited, if they still fit. */
function carryOver(defaults: Record<string, unknown>, previous: Record<string, unknown>) {
  const next = { ...defaults };
  for (const [name, value] of Object.entries(previous)) {
    if (Object.hasOwn(defaults, name) && typeof defaults[name] === typeof value) next[name] = value;
  }
  return next;
}

export function UiRuntime({ payload }: { payload: UiPayload }) {
  const decls = useMemo(() => collectDecls(payload.root), [payload.root]);
  const defaults = useMemo(() => defaultStateValues(decls) as Record<string, unknown>, [decls]);
  const [state, setStateValue] = useState<Record<string, unknown>>(defaults);
  const [stateRoot, setStateRoot] = useState(payload.root);
  if (stateRoot !== payload.root) {
    setStateRoot(payload.root);
    setStateValue(carryOver(defaults, state));
  }
  const data = payload.data ?? EMPTY_DATA;
  const scope = useMemo(
    () => computeScope(decls, { stateValues: state, dataValues: data, onError: () => {} }) as Record<string, unknown>,
    [decls, state, data],
  );
  const sliders = useMemo(() => collectSliders(payload.root), [payload.root]);
  const setState = useCallback((patch: Record<string, unknown>) => setStateValue((current) => ({ ...current, ...patch })), []);
  const reset = useCallback(() => setStateValue(defaults), [defaults]);
  const scopeFor = useCallback(
    (next: Record<string, unknown>) => computeScope(decls, { stateValues: next, dataValues: data, onError: () => {} }) as Record<string, unknown>,
    [decls, data],
  );
  const runtime = useMemo<Runtime>(
    () => ({ blockId: payload.id, root: payload.root, decls, data, defaults, state, scope, sliders, setState, reset, scopeFor }),
    [payload.id, payload.root, decls, data, defaults, state, scope, sliders, setState, reset, scopeFor],
  );
  return (
    <RuntimeContext.Provider value={runtime}>
      <div className="garden-ui-body">
        <RenderNodes nodes={payload.root.c} env={{ locals: [] }} />
      </div>
    </RuntimeContext.Provider>
  );
}
