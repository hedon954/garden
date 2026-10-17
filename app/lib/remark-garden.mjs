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

function rewriteChildren(node) {
  if (!Array.isArray(node.children)) return;
  const next = [];
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    const following = node.children[index + 1];
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
      if (kind.kind === "legacy") {
        next.push(gardenElement({ legacy: true, from: kind.lang || record.lang, suggestion: kind.suggestion }));
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

function walk(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "math" || node.type === "inlineMath") {
    node.value = protectMathIdentifiers(node.value);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child);
    rewriteChildren(node);
  }
}

export function remarkGarden() {
  return (tree) => {
    walk(tree);
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
