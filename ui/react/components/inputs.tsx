"use client";

import { useId, useState } from "react";
import { formatValue } from "../../core/format.mjs";
import { isPowerOfTwo } from "../../core/state.mjs";
import { asNumber, asString, evalExpr, expandChildren, lookupFor, propValue, registerComponents, RenderNodes, useRuntime, type Runtime } from "../runtime";
import type { Env, UiNode } from "../types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

type SliderModel = {
  min: number;
  max: number;
  scale: "linear" | "log";
  snap: "none" | "int" | "pow2";
  step: number;
};

export function sliderModel(runtime: Runtime, node: UiNode, env: Env): SliderModel | null {
  const min = asNumber(propValue(runtime, node, "min", env));
  const max = asNumber(propValue(runtime, node, "max", env));
  if (min === undefined || max === undefined || min >= max) return null;
  const scale = propValue(runtime, node, "scale", env) === "log" && min > 0 ? "log" : "linear";
  const snapProp = propValue(runtime, node, "snap", env);
  const snap = snapProp === "int" || snapProp === "pow2" || snapProp === "none"
    ? snapProp
    : scale === "log" && isPowerOfTwo(min) && isPowerOfTwo(max) ? "pow2" : "none";
  const step = asNumber(propValue(runtime, node, "step", env)) ?? (Number.isInteger(min) && Number.isInteger(max) ? 1 : (max - min) / 100);
  return { min, max, scale, snap, step };
}

export function clampToSlider(model: SliderModel, value: number) {
  let next = Math.min(model.max, Math.max(model.min, value));
  if (model.snap === "pow2") next = 2 ** Math.round(Math.log2(next));
  else if (model.snap === "int" || (model.scale === "linear" && Number.isInteger(model.step) && Number.isInteger(model.min))) next = Math.round(next);
  return Math.min(model.max, Math.max(model.min, next));
}

const LOG_RESOLUTION = 1000;

function Slider({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const id = useId();
  const bind = String(node.p?.bind && node.p.bind.k === "lit" ? node.p.bind.v : "");
  const model = sliderModel(runtime, node, env);
  const label = asString(propValue(runtime, node, "label", env));
  const format = propValue(runtime, node, "format", env) as string | undefined;
  const unit = asString(propValue(runtime, node, "unit", env));
  const value = asNumber(runtime.state[bind]) ?? model?.min ?? 0;
  if (!model) return <p className="garden-ui-error-inline">滑杆 {label} 的范围无效</p>;

  let position: number;
  let inputMin = model.min;
  let inputMax = model.max;
  let inputStep: number | "any" = model.step;
  if (model.snap === "pow2") {
    inputMin = Math.log2(model.min);
    inputMax = Math.log2(model.max);
    inputStep = 1;
    position = Math.round(Math.log2(value));
  } else if (model.scale === "log") {
    inputMin = 0;
    inputMax = LOG_RESOLUTION;
    inputStep = 1;
    position = Math.round(((Math.log(value) - Math.log(model.min)) / (Math.log(model.max) - Math.log(model.min))) * LOG_RESOLUTION);
  } else {
    position = value;
    inputStep = model.step > 0 ? model.step : "any";
  }

  const fromPosition = (raw: number) => {
    if (model.snap === "pow2") return 2 ** raw;
    if (model.scale === "log") return Math.exp(Math.log(model.min) + (raw / LOG_RESOLUTION) * (Math.log(model.max) - Math.log(model.min)));
    return raw;
  };

  return (
    <div className="garden-ui-slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id} aria-live="polite">{formatValue(value, format)}{unit ? ` ${unit}` : ""}</output>
      </label>
      <div className="garden-ui-slider-track">
        <input
          id={id}
          type="range"
          min={inputMin}
          max={inputMax}
          step={inputStep}
          value={position}
          aria-valuetext={`${formatValue(value, format)}${unit ? ` ${unit}` : ""}`}
          onChange={(event) => runtime.setState({ [bind]: clampToSlider(model, fromPosition(Number(event.target.value))) })}
        />
      </div>
    </div>
  );
}

function Choice({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const id = useId();
  const bind = String(node.p?.bind && node.p.bind.k === "lit" ? node.p.bind.v : "");
  const label = asString(propValue(runtime, node, "label", env));
  const rawOptions = propValue(runtime, node, "options", env);
  const options = (Array.isArray(rawOptions) ? rawOptions : []).map((option) =>
    isPlainObject(option) ? { value: option.value, label: asString(option.label ?? option.value) } : { value: option, label: asString(option) },
  );
  const style = propValue(runtime, node, "style", env) ?? (options.length <= 5 ? "segmented" : "select");
  const current = runtime.state[bind];
  if (style === "select") {
    return (
      <div className="garden-ui-choice">
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          value={String(options.findIndex((option) => option.value === current))}
          onChange={(event) => runtime.setState({ [bind]: options[Number(event.target.value)]?.value })}
        >
          {options.map((option, index) => (
            <option key={index} value={String(index)}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="garden-ui-choice" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`}>{label}</span>
      <span className="garden-ui-segmented">
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={option.value === current}
            onClick={() => runtime.setState({ [bind]: option.value })}
          >
            {option.label}
          </button>
        ))}
      </span>
    </div>
  );
}

function Toggle({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const bind = String(node.p?.bind && node.p.bind.k === "lit" ? node.p.bind.v : "");
  const on = Boolean(runtime.state[bind]);
  return (
    <button type="button" role="switch" aria-checked={on} className="garden-ui-toggle" onClick={() => runtime.setState({ [bind]: !on })}>
      <span className="garden-ui-switch" aria-hidden="true" />
      <span>{asString(propValue(runtime, node, "label", env))}</span>
    </button>
  );
}

/** Clamps values set by a Button to the input or switcher that owns the state. */
function clampForState(runtime: Runtime, name: string, value: unknown) {
  if (typeof value !== "number") return value;
  const slider = runtime.sliders.get(name);
  if (slider) {
    const model = sliderModel(runtime, slider, { locals: [] });
    if (model) return clampToSlider(model, value);
  }
  let count: number | null = null;
  const visit = (node: UiNode) => {
    if (count !== null) return;
    if (node.t === "el" && (node.n === "Steps" || node.n === "Tabs") && node.p?.bind?.k === "lit" && node.p.bind.v === name) {
      count = expandChildren(runtime, node.c, { locals: [] }).length;
      return;
    }
    node.c?.forEach(visit);
  };
  visit(runtime.root);
  return count === null ? value : Math.max(0, Math.min((count as number) - 1, Math.trunc(value)));
}

function Button({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const tone = asString(propValue(runtime, node, "tone", env), "plain");
  const onClick = () => {
    if (node.p?.reset) {
      runtime.reset();
      return;
    }
    const prop = node.p?.set;
    if (!prop || prop.k !== "expr") return;
    const patch = evalExpr(prop.e, lookupFor(runtime, env));
    if (!isPlainObject(patch)) return;
    const next: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(patch)) {
      if (!Object.hasOwn(runtime.defaults, name) || typeof runtime.defaults[name] !== typeof value) continue;
      next[name] = clampForState(runtime, name, value);
    }
    runtime.setState(next);
  };
  return (
    <button type="button" className={`garden-ui-button garden-ui-tone-${tone}`} onClick={onClick}>
      <RenderNodes nodes={node.c} env={env} />
    </button>
  );
}

function Stepper({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const bind = String(node.p?.bind && node.p.bind.k === "lit" ? node.p.bind.v : "");
  const min = asNumber(propValue(runtime, node, "min", env)) ?? 0;
  const max = asNumber(propValue(runtime, node, "max", env)) ?? min;
  const step = asNumber(propValue(runtime, node, "step", env)) ?? 1;
  const label = propValue(runtime, node, "label", env);
  const unit = propValue(runtime, node, "unit", env);
  const current = asNumber(runtime.state[bind]) ?? min;
  const set = (next: number) => runtime.setState({ [bind]: Math.max(min, Math.min(max, next)) });
  return (
    <div className="garden-ui-stepper">
      {label !== undefined ? <span className="garden-ui-stepper-label">{asString(label)}</span> : null}
      <div className="garden-ui-stepper-row">
        <button type="button" className="garden-ui-round" aria-label="减少" onClick={() => set(current - step)} disabled={current <= min}>−</button>
        <span className="garden-ui-stepper-value" aria-live="polite">{current}</span>
        {unit !== undefined ? <span className="garden-ui-stepper-unit">{asString(unit)}</span> : null}
        <button type="button" className="garden-ui-round" aria-label="增加" onClick={() => set(current + step)} disabled={current >= max}>+</button>
      </div>
    </div>
  );
}

function Checklist({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const raw = propValue(runtime, node, "items", env);
  const items: Record<string, unknown>[] = (Array.isArray(raw) ? raw : []).map((item) => (isPlainObject(item) ? item : { title: item }));
  const title = propValue(runtime, node, "title", env);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const toggle = (index: number) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const detailed = items.some((item) => item.time !== undefined || item.note !== undefined);
  const progress = items.length ? (checked.size / items.length) * 100 : 0;
  return (
    <div className={`garden-ui-checklist${detailed ? " garden-ui-checklist-detailed" : ""}`}>
      <div className="garden-ui-checklist-head">
        {title !== undefined ? <strong>{asString(title)}</strong> : <span />}
        <span aria-live="polite">{checked.size} / {items.length}</span>
      </div>
      <div className="garden-ui-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <ul>
        {items.map((item, index) => (
          <li key={index} data-done={checked.has(index) ? "true" : undefined}>
            <label>
              <input type="checkbox" checked={checked.has(index)} onChange={() => toggle(index)} />
              <span className="garden-ui-checklist-text">
                {item.time !== undefined ? <span className="garden-ui-checklist-time">{asString(item.time)}</span> : null}
                <span className="garden-ui-checklist-title">{asString(item.title)}</span>
                {item.note !== undefined ? <span className="garden-ui-checklist-note">{asString(item.note)}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

registerComponents({ Slider, Choice, Toggle, Button, Checklist, Stepper });
