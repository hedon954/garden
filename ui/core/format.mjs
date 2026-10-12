const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const significant = (value) => String(Number(value.toPrecision(3)));

export function fixed(value, digits = 0) {
  if (!isFiniteNumber(value)) return "—";
  const places = Math.max(0, Math.min(20, Math.trunc(Number(digits) || 0)));
  return value.toFixed(places);
}

export function percent(value, digits = 0) {
  if (!isFiniteNumber(value)) return "—";
  return `${fixed(value * 100, digits)}%`;
}

const binaryUnits = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

export function bytes(value) {
  if (!isFiniteNumber(value)) return "—";
  const sign = value < 0 ? "-" : "";
  let amount = Math.abs(value);
  let unit = 0;
  while (amount >= 1024 && unit < binaryUnits.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${sign}${significant(amount)} ${binaryUnits[unit]}`;
}

const decimalUnits = ["", "K", "M", "G", "T"];

export function si(value) {
  if (!isFiniteNumber(value)) return "—";
  const sign = value < 0 ? "-" : "";
  let amount = Math.abs(value);
  let unit = 0;
  while (amount >= 1000 && unit < decimalUnits.length - 1) {
    amount /= 1000;
    unit += 1;
  }
  return `${sign}${significant(amount)}${decimalUnits[unit]}`;
}

export function thousands(value) {
  if (!isFiniteNumber(value)) return "—";
  const [integer, fraction] = String(Math.abs(value)).split(".");
  if (integer.includes("e")) return String(value);
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return `${value < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function float32(value) {
  return typeof value === "number" ? Math.fround(value) : Number.NaN;
}

function bits(value, byteLength, exponentBits) {
  if (typeof value !== "number") return "—";
  const view = new DataView(new ArrayBuffer(byteLength));
  if (byteLength === 8) view.setFloat64(0, value);
  else view.setFloat32(0, value);
  let binary = "";
  for (let index = 0; index < byteLength; index += 1) {
    binary += view.getUint8(index).toString(2).padStart(8, "0");
  }
  return `${binary[0]} ${binary.slice(1, 1 + exponentBits)} ${binary.slice(1 + exponentBits)}`;
}

export const bits64 = (value) => bits(value, 8, 11);
export const bits32 = (value) => bits(value, 4, 8);

const FORMAT_PATTERN = /^(?:number|bytes|si|thousands|percent(?::\d{1,2})?|fixed:\d{1,2})$/u;

export function isValidFormat(format) {
  return typeof format === "string" && FORMAT_PATTERN.test(format);
}

/** Display rule shared by props, interpolation and static snapshots. */
export function formatValue(value, format) {
  if (value === undefined || value === null) return "—";
  if (typeof value === "number" && !Number.isFinite(value)) return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value !== "number") {
    if (Array.isArray(value)) return value.map((item) => formatValue(item)).join("、");
    if (typeof value === "object") return "—";
    return String(value);
  }
  if (!format || format === "number") return String(value);
  if (format === "bytes") return bytes(value);
  if (format === "si") return si(value);
  if (format === "thousands") return thousands(value);
  const percentMatch = /^percent(?::(\d{1,2}))?$/u.exec(format);
  if (percentMatch) return percent(value, Number(percentMatch[1] ?? 0));
  const fixedMatch = /^fixed:(\d{1,2})$/u.exec(format);
  if (fixedMatch) return fixed(value, Number(fixedMatch[1]));
  return String(value);
}
