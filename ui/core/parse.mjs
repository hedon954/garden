import * as acorn from "acorn";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxExpressionFromMarkdown } from "mdast-util-mdx-expression";
import { mdxJsxFromMarkdown } from "mdast-util-mdx-jsx";
import { mdxExpression } from "micromark-extension-mdx-expression";
import { mdxJsx } from "micromark-extension-mdx-jsx";
import { COMPONENTS } from "./catalog.mjs";
import { pruneExpr } from "./expr.mjs";

const parseOptions = {
  extensions: [
    mdxJsx({ acorn, addResult: true }),
    mdxExpression({ acorn, addResult: true }),
    // Same as MDX: indentation inside elements must not become code blocks.
    { disable: { null: ["autolink", "codeIndented", "htmlFlow", "htmlText"] } },
  ],
  mdastExtensions: [mdxJsxFromMarkdown(), mdxExpressionFromMarkdown()],
};

const lineOf = (node) => node?.position?.start?.line ?? 1;

function errorLine(error) {
  const place = error?.place;
  if (place?.line) return place.line;
  if (place?.start?.line) return place.start.line;
  if (typeof error?.line === "number") return error.line;
  const match = /\((\d+):\d+/u.exec(String(error?.message ?? ""));
  return match ? Number(match[1]) : 1;
}

const isBlockElement = (node) =>
  node.t === "el" && !(COMPONENTS[node.n]?.inline);

function expressionFrom(estree) {
  const statement = estree?.body?.[0];
  if (!statement || statement.type !== "ExpressionStatement" || estree.body.length !== 1) return null;
  return pruneExpr(statement.expression);
}

/**
 * Parses the body of a `ui` fence. Never executes code: expressions become
 * pruned ESTree that only `expr.mjs` interprets.
 */
export function parseUiBody(text) {
  const diagnostics = [];
  const report = (code, line, message) => diagnostics.push({ code, line, message, severity: "error" });
  let tree;
  try {
    tree = fromMarkdown(text, parseOptions);
  } catch (error) {
    report("ui-syntax", errorLine(error), String(error?.reason ?? error?.message ?? "无法解析").split("\n")[0]);
    return { root: null, diagnostics };
  }

  const convertAttributes = (node) => {
    const props = {};
    for (const attribute of node.attributes) {
      if (attribute.type !== "mdxJsxAttribute") {
        report("ui-syntax", lineOf(node), `<${node.name}> 不能使用展开属性`);
        continue;
      }
      if (attribute.value === null || attribute.value === undefined) {
        props[attribute.name] = { k: "lit", v: true };
      } else if (typeof attribute.value === "string") {
        props[attribute.name] = { k: "lit", v: attribute.value };
      } else {
        const expression = expressionFrom(attribute.value.data?.estree);
        if (!expression) {
          report("ui-expr", lineOf(node), `<${node.name}> 的 ${attribute.name} 需要一个表达式`);
          continue;
        }
        if (expression.type === "Literal" && !expression.regex) {
          props[attribute.name] = { k: "lit", v: expression.value, s: attribute.value.value };
        } else if (expression.type === "UnaryExpression" && expression.operator === "-" && expression.argument.type === "Literal" && typeof expression.argument.value === "number") {
          props[attribute.name] = { k: "lit", v: -expression.argument.value, s: attribute.value.value };
        } else {
          props[attribute.name] = { k: "expr", e: expression, s: attribute.value.value };
        }
      }
    }
    return props;
  };

  const convertInline = (node) => {
    switch (node.type) {
      case "text":
        return [{ t: "text", v: node.value }];
      case "mdxTextExpression":
      case "mdxFlowExpression": {
        const expression = expressionFrom(node.data?.estree);
        if (!expression) {
          if (node.value.trim()) report("ui-expr", lineOf(node), "插值需要一个表达式");
          return [];
        }
        return [{ t: "x", e: expression, s: node.value, l: lineOf(node) }];
      }
      case "strong":
        return [{ t: "strong", c: node.children.flatMap(convertInline) }];
      case "emphasis":
        return [{ t: "em", c: node.children.flatMap(convertInline) }];
      case "inlineCode":
        return [{ t: "code", v: node.value }];
      case "break":
        return [{ t: "br" }];
      case "link": {
        const url = String(node.url ?? "");
        if (!/^(?:https:\/\/|\.{0,2}\/|#)/u.test(url) && !/^[\w\u3400-\u9fff./-]+$/u.test(url)) {
          report("ui-markdown", lineOf(node), "链接只能是相对路径或 https 地址");
          return node.children.flatMap(convertInline);
        }
        return [{ t: "link", u: url, c: node.children.flatMap(convertInline) }];
      }
      case "mdxJsxTextElement":
      case "mdxJsxFlowElement":
        return [convertElement(node)];
      case "image":
      case "imageReference":
        report("ui-markdown", lineOf(node), "块里不能写图片语法，插图用 <Image>");
        return [];
      case "html":
        report("ui-markdown", lineOf(node), "块里不能写 HTML");
        return [];
      case "linkReference":
      case "footnoteReference":
        return node.children ? node.children.flatMap(convertInline) : [];
      default:
        report("ui-markdown", lineOf(node), `块里不能写 ${node.type}`);
        return [];
    }
  };

  const trimInline = (nodes) => {
    const output = [...nodes];
    while (output.length && output[0].t === "text" && !output[0].v.trim()) output.shift();
    while (output.length && output.at(-1).t === "text" && !output.at(-1).v.trim()) output.pop();
    if (output[0]?.t === "text") output[0] = { ...output[0], v: output[0].v.replace(/^\s+/u, "") };
    if (output.at(-1)?.t === "text") output[output.length - 1] = { ...output.at(-1), v: output.at(-1).v.replace(/\s+$/u, "") };
    return output;
  };

  /** Block components written inside a paragraph are lifted out of it. */
  const splitParagraph = (inline) => {
    const blocks = [];
    let run = [];
    const flush = () => {
      const trimmed = trimInline(run);
      if (trimmed.length) blocks.push({ t: "p", c: trimmed });
      run = [];
    };
    for (const node of inline) {
      if (isBlockElement(node)) {
        flush();
        blocks.push(node);
      } else {
        run.push(node);
      }
    }
    flush();
    return blocks;
  };

  const convertBlock = (node) => {
    switch (node.type) {
      case "paragraph":
        return splitParagraph(node.children.flatMap(convertInline));
      case "mdxJsxFlowElement":
        return [convertElement(node)];
      case "mdxFlowExpression":
        return splitParagraph(convertInline(node));
      case "list":
        return [{
          t: "list",
          o: Boolean(node.ordered),
          s: node.start ?? 1,
          c: node.children.map((item) => ({ t: "li", c: item.children.flatMap(convertBlock) })),
        }];
      case "blockquote":
        return [{ t: "quote", c: node.children.flatMap(convertBlock) }];
      case "thematicBreak":
        return [{ t: "hr" }];
      case "heading":
        report("ui-markdown", lineOf(node), "块里不能写标题，它会打乱文章目录");
        return [];
      case "code":
        report("ui-markdown", lineOf(node), "块里不能写代码围栏，代码用 <Code>");
        return [];
      case "html":
        report("ui-markdown", lineOf(node), "块里不能写 HTML");
        return [];
      case "definition":
      case "footnoteDefinition":
        report("ui-markdown", lineOf(node), `块里不能写 ${node.type}`);
        return [];
      default:
        return splitParagraph(convertInline(node));
    }
  };

  function convertElement(node) {
    const name = node.name ?? "";
    if (!name) report("ui-syntax", lineOf(node), "块里不能写空标签 <>");
    let children;
    if (node.type === "mdxJsxTextElement") {
      const inline = node.children.flatMap(convertInline);
      // One-line containers such as <Step>…</Step> hold a paragraph, not loose inline nodes.
      children = COMPONENTS[name]?.children === "text" ? trimInline(inline) : splitParagraph(inline);
    } else {
      children = node.children.flatMap(convertBlock);
    }
    return { t: "el", n: name, p: convertAttributes(node), c: children, l: lineOf(node) };
  }

  const root = { t: "root", c: tree.children.flatMap(convertBlock) };
  if (/^\s*(?:import|export)\s/mu.test(text)) {
    const line = text.split("\n").findIndex((current) => /^\s*(?:import|export)\s/u.test(current)) + 1;
    report("ui-markdown", line, "块里不能写 import / export");
  }
  return { root, diagnostics };
}

/** Best-effort parse of half-written input: drops trailing lines until it parses. */
export function parseUiBodyPartial(text) {
  const lines = text.split("\n");
  for (let end = lines.length; end > 0; end -= 1) {
    const attempt = parseUiBody(lines.slice(0, end).join("\n"));
    if (attempt.root) return { ...attempt, truncatedAt: end < lines.length ? end : null };
  }
  return parseUiBody("");
}
