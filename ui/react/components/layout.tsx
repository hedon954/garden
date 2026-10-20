"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { asNumber, asString, expandChildren, propValue, registerComponents, RenderNodes, useRuntime } from "../runtime";
import type { Env, UiNode } from "../types";
import { useRuntimeText } from "../lang";

const GAPS = [0, 4, 8, 12, 16];
const gapOf = (value: unknown, fallback = 3) => GAPS[typeof value === "number" && value >= 0 && value <= 4 ? value : fallback];

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false),
    () => false,
  );
}

function Stack({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const direction = asString(propValue(runtime, node, "direction", env), "col") === "row" ? "row" : "col";
  return (
    <div className="garden-ui-stack" data-direction={direction} style={{ gap: gapOf(propValue(runtime, node, "gap", env)) }}>
      <RenderNodes nodes={node.c} env={env} />
    </div>
  );
}

function Columns({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const min = asNumber(propValue(runtime, node, "min", env)) ?? 220;
  return (
    <div
      className="garden-ui-columns"
      style={{ gap: gapOf(propValue(runtime, node, "gap", env)), ["--garden-ui-col-min" as string]: `${min}px` }}
    >
      {(node.c ?? []).map((child, index) => (
        <div className="garden-ui-column" key={index}>
          <RenderNodes nodes={[child]} env={env} />
        </div>
      ))}
    </div>
  );
}

function Card({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const title = propValue(runtime, node, "title", env);
  const tone = asString(propValue(runtime, node, "tone", env), "plain");
  return (
    <section className={`garden-ui-card garden-ui-tone-${tone}`}>
      {title !== undefined ? <p className="garden-ui-card-title">{asString(title)}</p> : null}
      <RenderNodes nodes={node.c} env={env} />
    </section>
  );
}

/** Index of a bound Steps / Tabs lives in block state; unbound ones keep it locally. */
function useIndex(node: UiNode, count: number) {
  const runtime = useRuntime();
  const bind = node.p?.bind?.k === "lit" ? String(node.p.bind.v) : null;
  const [local, setLocal] = useState(0);
  const raw = bind ? asNumber(runtime.state[bind]) ?? 0 : local;
  const index = Math.max(0, Math.min(count - 1, Math.trunc(raw)));
  const setIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    if (bind) runtime.setState({ [bind]: clamped });
    else setLocal(clamped);
  };
  return [index, setIndex] as const;
}

function Tabs({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const tabs = expandChildren(runtime, node.c, env).filter((item) => item.node.n === "Tab");
  const [index, setIndex] = useIndex(node, tabs.length);
  const baseId = useId().replaceAll(":", "");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (event: KeyboardEvent, next: number) => {
    event.preventDefault();
    const target = (next + tabs.length) % tabs.length;
    setIndex(target);
    refs.current[target]?.focus();
  };
  return (
    <div className="garden-ui-tabs">
      <div className="garden-ui-tablist" role="tablist">
        {tabs.map((tab, tabIndex) => (
          <button
            key={tabIndex}
            ref={(element) => {
              refs.current[tabIndex] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tabIndex}`}
            aria-selected={tabIndex === index}
            aria-controls={`${baseId}-panel-${tabIndex}`}
            tabIndex={tabIndex === index ? 0 : -1}
            onClick={() => setIndex(tabIndex)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") move(event, tabIndex + 1);
              if (event.key === "ArrowLeft") move(event, tabIndex - 1);
              if (event.key === "Home") move(event, 0);
              if (event.key === "End") move(event, tabs.length - 1);
            }}
          >
            {asString(propValue(runtime, tab.node, "title", tab.env))}
          </button>
        ))}
      </div>
      {tabs.map((tab, tabIndex) => (
        <div
          key={tabIndex}
          role="tabpanel"
          id={`${baseId}-panel-${tabIndex}`}
          aria-labelledby={`${baseId}-tab-${tabIndex}`}
          hidden={tabIndex !== index}
          className="garden-ui-tabpanel"
        >
          <RenderNodes nodes={tab.node.c} env={tab.env} />
        </div>
      ))}
    </div>
  );
}

function Steps({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const tx = useRuntimeText();
  const steps = expandChildren(runtime, node.c, env).filter((item) => item.node.n === "Step");
  const [index, setIndex] = useIndex(node, steps.length);
  const autoplay = asNumber(propValue(runtime, node, "autoplay", env));
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(Boolean(autoplay));
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  const setIndexRef = useRef(setIndex);
  useEffect(() => {
    indexRef.current = index;
    setIndexRef.current = setIndex;
  });

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const active = Boolean(autoplay) && playing && visible && !reducedMotion;
  useEffect(() => {
    if (!active || !autoplay) return;
    const timer = window.setInterval(() => {
      if (indexRef.current >= steps.length - 1) {
        setPlaying(false);
        return;
      }
      setIndexRef.current(indexRef.current + 1);
    }, Math.max(800, autoplay));
    return () => window.clearInterval(timer);
  }, [active, autoplay, steps.length]);

  const [animate, setAnimate] = useState(false);
  const go = (next: number) => {
    setPlaying(false);
    setAnimate(true);
    setIndex(next);
  };
  const current = steps[index];
  return (
    <div
      ref={rootRef}
      className="garden-ui-steps"
      data-animate={animate || active ? "true" : undefined}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget && (event.target as HTMLElement).tagName === "INPUT") return;
        if (event.key === "ArrowRight") go(index + 1);
        if (event.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="garden-ui-steps-head">
        <strong>{current ? asString(propValue(runtime, current.node, "title", current.env)) : ""}</strong>
        <span>{steps.length ? `${index + 1} / ${steps.length}` : ""}</span>
      </div>
      <div className="garden-ui-progress" aria-hidden="true">
        <span style={{ width: `${steps.length ? ((index + 1) / steps.length) * 100 : 0}%` }} />
      </div>
      <div className="garden-ui-steps-stage">
        {steps.map((step, stepIndex) => (
          <div
            key={stepIndex}
            className="garden-ui-step"
            data-active={stepIndex === index ? "true" : undefined}
            aria-hidden={stepIndex !== index}
            inert={stepIndex !== index}
          >
            <RenderNodes nodes={step.node.c} env={step.env} />
          </div>
        ))}
      </div>
      <div className="garden-ui-steps-controls">
        <button type="button" className="garden-ui-round" aria-label={tx.prevStep} onClick={() => go(index - 1)} disabled={index === 0}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
        </button>
        <span className="garden-ui-steps-dots">
          {steps.map((step, stepIndex) => (
            <button
              key={stepIndex}
              type="button"
              aria-label={tx.stepN(stepIndex + 1, asString(propValue(runtime, step.node, "title", step.env)))}
              aria-current={stepIndex === index ? "step" : undefined}
              onClick={() => go(stepIndex)}
            />
          ))}
        </span>
        <button type="button" className="garden-ui-round" aria-label={tx.nextStep} onClick={() => go(index + 1)} disabled={index >= steps.length - 1}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
        </button>
        {autoplay && !reducedMotion ? (
          <button type="button" className="garden-ui-button" onClick={() => setPlaying((value) => !value)}>{playing ? tx.pause : tx.play}</button>
        ) : null}
      </div>
    </div>
  );
}

registerComponents({ Stack, Columns, Card, Tabs, Steps });
