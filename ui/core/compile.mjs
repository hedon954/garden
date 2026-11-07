import { resolveSidecarPath } from "./fence.mjs";
import { checkUiBlock } from "./validate.mjs";

export const PAYLOAD_VERSION = 1;

function stripTree(node, resolveImage) {
  if (Array.isArray(node)) return node.map((child) => stripTree(child, resolveImage));
  if (!node || typeof node !== "object") return node;
  const output = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "l" || key === "s") continue;
    output[key] = value && typeof value === "object" ? stripTree(value, resolveImage) : value;
  }
  if (output.t === "el" && output.n === "Image" && output.p?.src?.k === "lit" && resolveImage) {
    output.p = { ...output.p, src: { k: "lit", v: resolveImage(String(output.p.src.v)) } };
  }
  return output;
}

/**
 * Checks lowered internal component source and, when it passes, returns the JSON payload the
 * reading page renders. `resolveAsset(sidecarPath, written)` maps Image paths
 * to public URLs.
 */
export function compileUiBlock(body, options = {}) {
  const { markdownPath = null, resolveAsset = null } = options;
  const check = checkUiBlock(body, options);
  if (!check.ok) return { payload: null, check };
  const resolveImage = resolveAsset && markdownPath
    ? (written) => {
        const resolved = resolveSidecarPath(markdownPath, written);
        return resolved.path ? resolveAsset(resolved.path, written) : written;
      }
    : null;
  return {
    payload: {
      v: PAYLOAD_VERSION,
      id: check.header.id,
      caption: check.header.caption.trim(),
      frame: check.header.frame === "none" ? "none" : "card",
      root: stripTree(check.root, resolveImage),
      data: check.dataValues ?? {},
    },
    check,
  };
}

/** Serializes JSON into a fence whose marker is longer than any backtick run inside. */
export function readPayload(source) {
  try {
    const value = JSON.parse(String(source).trim());
    if (!value || value.v !== PAYLOAD_VERSION || !value.root) return null;
    return value;
  } catch {
    return null;
  }
}
