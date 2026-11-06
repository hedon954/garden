/** Linear "nice" ticks for a domain. Always includes the domain endpoints. */
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const ratio = rough / magnitude;
  const step = (ratio >= 7.5 ? 10 : ratio >= 3.5 ? 5 : ratio >= 1.5 ? 2 : 1) * magnitude;
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Math.abs(value) < step * 1e-9 ? 0 : Number(value.toPrecision(12)));
  }
  return ensureDomainEndpointTicks(ticks, min, max);
}

/** Ticks that read well in the axis format: nice numbers inside the chosen binary unit for bytes. */
export function formatTicks(min, max, count, format) {
  if (format !== "bytes" || max <= 0) return niceTicks(min, max, count);
  let unit = 1;
  while (max / unit >= 1024 && unit < 1024 ** 5) unit *= 1024;
  return niceTicks(min / unit, max / unit, count).map((tick) => tick * unit);
}

/** Author-specified linear step: min, min+step, … and the domain max when it is not on a step. */
export function stepTicks(min, max, step) {
  if (!(step > 0) || !Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  const ticks = [];
  const n = Math.floor((max - min) / step + 1e-9);
  for (let i = 0; i <= n; i += 1) {
    const value = min + i * step;
    ticks.push(Math.abs(value) < step * 1e-9 ? 0 : Number(value.toPrecision(12)));
  }
  return ensureDomainEndpointTicks(ticks, min, max);
}

/**
 * Keep ticks inside [min, max] and guarantee both endpoints are labeled.
 * Generic: expanded overflow domains (e.g. 0→0.45 after yMax=0.4) get a top tick
 * even when "nice" steps would stop at 0.4.
 */
export function ensureDomainEndpointTicks(ticks, min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return Array.isArray(ticks) ? [...ticks] : [];
  const span = max - min;
  const eps = Math.max(span * 1e-9, 1e-12);
  const near = (a, b) => Math.abs(a - b) <= Math.max(eps, span * 1e-6, 1e-12);
  const out = (Array.isArray(ticks) ? ticks : []).filter((t) => Number.isFinite(t) && t >= min - eps && t <= max + eps);
  if (out.length === 0 || !near(out[0], min)) out.unshift(Number(min.toPrecision(12)));
  if (!near(out[out.length - 1], max)) out.push(Number(max.toPrecision(12)));
  return out.filter((t, i) => i === 0 || !near(t, out[i - 1]));
}


/**
 * Thin ticks when labels would collide, always keeping domain endpoints.
 * `position(tick)` returns the axis coordinate (px); `minGap` is minimum spacing.
 * Used for both x (horizontal) and y (vertical) so an expanded max (e.g. 45%)
 * is not dropped when a nearby nice step (40%) would win a stride filter.
 */
export function fitTicksPreserveEnds(ticks, position, minGap) {
  if (!Array.isArray(ticks) || ticks.length <= 2) return Array.isArray(ticks) ? [...ticks] : [];
  const first = ticks[0];
  const last = ticks[ticks.length - 1];
  const spaced = (kept) => {
    for (let i = 1; i < kept.length; i += 1) {
      if (Math.abs(position(kept[i]) - position(kept[i - 1])) < minGap) return false;
    }
    return true;
  };
  for (let stride = 1; stride < ticks.length; stride += 1) {
    const mid = [];
    for (let i = 1; i < ticks.length - 1; i += 1) {
      if (i % stride === 0) mid.push(ticks[i]);
    }
    const kept = [first, ...mid, last];
    // de-dupe if an end coincided with a stride hit
    const uniq = kept.filter((t, i) => i === 0 || t !== kept[i - 1]);
    if (spaced(uniq)) return uniq;
  }
  return [first, last];
}
