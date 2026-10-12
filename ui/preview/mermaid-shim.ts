// Editor hosts (Obsidian, Typora) ship their own Mermaid; the preview bundle uses it instead of bundling a copy.
type MermaidLike = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};

const host = () => (globalThis as { mermaid?: MermaidLike }).mermaid;

const mermaid: MermaidLike = {
  // The host owns its Mermaid configuration; re-initializing would restyle the host's own diagrams.
  initialize() {},
  render(id, source) {
    const instance = host();
    if (!instance) return Promise.reject(new Error("这个编辑器没有提供 Mermaid"));
    return instance.render(id, source);
  },
};

export default mermaid;
