/**
 * Spoken starters for "insert an intent block". Editors show `label`, insert
 * `text`; component names never appear, authors only describe what readers do.
 */
export const STARTERS = [
  { id: "knob", label: "让读者拧一个数", text: "让读者拖动「」，看「」怎么跟着变。" },
  { id: "steps", label: "让读者一步步走完", text: "分几步演示「」，每一步高亮「」，读者可以前后翻。" },
  { id: "compare", label: "并排对比两种做法", text: "把「」和「」并排对比，读者切换时能看出「」的差别。" },
  { id: "grid", label: "让读者点格子看解释", text: "画一张「」的格子图，读者点每一格，显示「」。" },
  { id: "flow", label: "沿着流程走", text: "沿着「」的流程走一遍，每一步说明「」。" },
  { id: "checklist", label: "给一张可勾选的清单", text: "列一张「」的清单，读者可以勾选，显示完成了几项。" },
  { id: "data", label: "用这份数据画图", text: "用同名目录里的「.csv」画图，横轴是「」，纵轴是「」。" },
];

/** The fence an editor inserts; `text` may be empty for a blank block. */
export function intentFence(text = "") {
  return `\`\`\`intent\n${text}\n\`\`\`\n`;
}
