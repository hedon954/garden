/**
 * Handbook field tables (first header "字段"/"Field" plus a "是否必填"/"Required"
 * column): tag the table, mark the Required column, and give every body cell its
 * column name, so narrow screens can show each row as a small card.
 */
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";

const FIELD = new Set(["字段", "field"]);
const REQUIRED = new Set(["是否必填", "required"]);

const cells = (row) => (row?.children ?? []).filter((node) => node.type === "element" && (node.tagName === "th" || node.tagName === "td"));
const rows = (node) => {
  const out = [];
  visit(node, "element", (child) => { if (child.tagName === "tr") out.push(child); });
  return out;
};
const addClass = (node, name) => {
  const props = (node.properties ??= {});
  const list = Array.isArray(props.className) ? props.className : props.className ? [String(props.className)] : [];
  if (!list.includes(name)) props.className = [...list, name];
};

export function isFieldTableHeader(labels) {
  return labels.length >= 3 && FIELD.has(labels[0].trim().toLowerCase()) && labels.some((label) => REQUIRED.has(label.trim().toLowerCase()));
}

export function rehypeFieldTables() {
  return (tree) => {
    visit(tree, "element", (table) => {
      if (table.tagName !== "table") return;
      const [head, ...body] = rows(table);
      const labels = cells(head).map((cell) => toString(cell).trim());
      if (!isFieldTableHeader(labels)) return;
      addClass(table, "field-table");
      const required = labels.findIndex((label) => REQUIRED.has(label.toLowerCase()));
      cells(head).forEach((cell, i) => { if (i === required) addClass(cell, "ft-req"); });
      for (const row of body) {
        cells(row).forEach((cell, i) => {
          cell.properties = { ...(cell.properties ?? {}), dataLabel: labels[i] ?? "" };
          if (i === required) addClass(cell, "ft-req");
        });
      }
    });
  };
}
