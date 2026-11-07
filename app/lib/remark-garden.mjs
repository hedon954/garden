import { renderCompose } from "../../ui/compose/render.mjs";
import { diffToNewCode, protectMathIdentifiers } from "../../ui/garden/enhance.mjs";
import { classifyFence } from "../../ui/garden/parse.mjs";

function gardenElement(payload) {
  return {
    type: "gardenBlock",
    data: {
      hName: "garden-block",
      hProperties: { dataPayload: encodeURIComponent(JSON.stringify(payload)) },
    },
  };
}

function codeDiffElement(code, diff) {
  return {
    type: "gardenCodeDiff",
    data: {
      hName: "garden-codediff",
      hProperties: {
        dataNew: encodeURIComponent(diffToNewCode(diff.value)),
        dataDiff: encodeURIComponent(diff.value),
      },
    },
    children: [code],
  };
}

function fenceNodeToRecord(node) {
  return { lang: String(node.lang || "").toLowerCase(), meta: String(node.meta || ""), info: `${node.lang || ""} ${node.meta || ""}`.trim() };
}

function htmlElement(value) {
  return { type: "html", value };
}

const PAIR_ALT = new Set(["ChatGPT 原图", "ChatGPT original"]);

function pairImage(node) {
  if (node?.type !== "paragraph" || !Array.isArray(node.children)) return null;
  const images = node.children.filter((child) => child?.type === "image");
  if (images.length !== 1 || node.children.some((child) => child?.type !== "image" && String(child.value ?? "").trim())) return null;
  const image = images[0];
  const alt = String(image.alt ?? "").trim();
  return PAIR_ALT.has(alt) ? { image, alt } : null;
}

function element(tag, className, children) {
  return {
    type: "paragraph",
    data: { hName: tag, hProperties: { className: [className] } },
    children,
  };
}

function composePair(image, alt, composeHtml) {
  return element("div", "g-compose-pair", [
    element("figure", "g-compose-pair-ref", [
      element("figcaption", "g-compose-pair-k", [{ type: "text", value: alt }]),
      image,
    ]),
    element("div", "g-compose-pair-live", [
      element("p", "g-compose-pair-k", [{ type: "text", value: "Garden Compose" }]),
      htmlElement(composeHtml),
    ]),
  ]);
}

function rewriteChildren(node, nextScope) {
  if (!Array.isArray(node.children)) return;
  const next = [];
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    const following = node.children[index + 1];
    const pair = pairImage(child);
    if (pair && following?.type === "code") {
      const record = fenceNodeToRecord(following);
      const kind = classifyFence({ ...record, body: following.value, line: 1, endLine: 1 });
      if (kind.kind === "garden" && kind.block?.name === "compose" && !kind.block.error && kind.block.mode !== "play") {
        next.push(composePair(pair.image, pair.alt, renderCompose(kind.block.props, { scope: nextScope() })));
        index += 1;
        continue;
      }
    }
    if (child?.type === "code" && following?.type === "code" && String(following.lang || "").toLowerCase() === "diff") {
      const current = fenceNodeToRecord(child);
      const kind = classifyFence({ lang: current.lang, meta: current.meta, info: current.info });
      if (kind.kind === "code") {
        next.push(codeDiffElement(child, following));
        index += 1;
        continue;
      }
    }
    if (child?.type === "code") {
      const record = fenceNodeToRecord(child);
      const kind = classifyFence({ ...record, body: child.value, line: 1, endLine: 1 });
      if (kind.kind === "garden" && kind.block?.name === "compose" && !kind.block.error && kind.block.mode !== "play") {
        next.push(htmlElement(renderCompose(kind.block.props, { scope: nextScope() })));
        continue;
      }
      if (kind.kind === "garden" && kind.block) {
        next.push(gardenElement(kind.block));
        continue;
      }
    }
    next.push(child);
  }
  node.children = next;
}

function walk(node, nextScope) {
  if (!node || typeof node !== "object") return;
  if (node.type === "math" || node.type === "inlineMath") {
    node.value = protectMathIdentifiers(node.value);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, nextScope);
    rewriteChildren(node, nextScope);
  }
}

export function remarkGarden() {
  let composeCount = 0;
  const nextScope = () => {
    composeCount += 1;
    return `gc${composeCount}`;
  };
  return (tree) => {
    walk(tree, nextScope);
  };
}

export function readGardenPayload(value) {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(String(value)));
  } catch {
    return null;
  }
}
