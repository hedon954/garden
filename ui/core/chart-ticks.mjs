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
