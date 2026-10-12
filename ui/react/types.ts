export type Expr = { type: string; [key: string]: unknown };

export type Prop = { k: "lit"; v: unknown } | { k: "expr"; e: Expr };

export type UiNode = {
  t: string;
  n?: string;
  p?: Record<string, Prop>;
  c?: UiNode[];
  v?: string;
  e?: Expr;
  u?: string;
  o?: boolean;
  s?: number;
};

export type UiPayload = {
  v: 1;
  id: string;
  caption: string;
  root: UiNode;
  data: Record<string, unknown>;
};

export type Lookup = (name: string) => { found: boolean; value: unknown };

export type Env = { locals: Record<string, unknown>[] };

export type Diagnostic = { code: string; line: number; message: string; severity: "error" | "warning" };
