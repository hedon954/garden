import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { codeLanguageLabel, fenceLanguage } from "../ui/garden/code-language.mjs";
import { renderFilePreview } from "../scripts/file-preview.mjs";

test("one label per language, whatever alias the fence uses", () => {
  assert.equal(codeLanguageLabel("py"), "PYTHON");
  assert.equal(codeLanguageLabel("python"), "PYTHON");
  assert.equal(codeLanguageLabel("Python"), "PYTHON");
  // JS and TS by their abbreviations, whatever the fence says.
  assert.equal(codeLanguageLabel("js"), "JS");
  assert.equal(codeLanguageLabel("javascript"), "JS");
  assert.equal(codeLanguageLabel("mjs"), "JS");
  assert.equal(codeLanguageLabel("ts"), "TS");
  assert.equal(codeLanguageLabel("typescript"), "TS");
  assert.equal(codeLanguageLabel("tsx"), "TSX");
  // Everything else by its full name.
  // Every shell reads SHELL.
  for (const name of ["sh", "zsh", "bash", "shell", "console", "Bash"]) assert.equal(codeLanguageLabel(name), "SHELL", name);
  assert.equal(codeLanguageLabel("rs"), "RUST");
  assert.equal(codeLanguageLabel("rust"), "RUST");
  assert.equal(codeLanguageLabel("yml"), "YAML");
  assert.equal(codeLanguageLabel("golang"), "GO");
  assert.equal(codeLanguageLabel("c++"), "C++");
  assert.equal(codeLanguageLabel("go"), "GO");
  assert.equal(codeLanguageLabel("sql"), "SQL");
  assert.equal(codeLanguageLabel(""), "");
  assert.equal(codeLanguageLabel(undefined), "");
});

test("language names keep their symbols: the parser does not stop at # or +", () => {
  assert.equal(fenceLanguage("language-c#"), "c#");
  assert.equal(fenceLanguage("hljs language-c++"), "c++");
  assert.equal(fenceLanguage(["hljs", "language-f#"]), "f#");
  assert.equal(fenceLanguage("language-objective-c"), "objective-c");
  assert.equal(fenceLanguage("language-shell-session extra"), "shell-session");
  assert.equal(fenceLanguage("language-"), "");
  assert.equal(fenceLanguage("hljs"), "");
  assert.equal(fenceLanguage(undefined), "");
  // C# and C++, by any of their names.
  for (const name of ["c#", "C#", "cs", "csharp"]) assert.equal(codeLanguageLabel(fenceLanguage(`language-${name}`)), "C#", name);
  for (const name of ["c++", "C++", "cpp", "cc", "hpp"]) assert.equal(codeLanguageLabel(fenceLanguage(`language-${name}`)), "C++", name);
  assert.equal(codeLanguageLabel("c"), "C");
  assert.equal(codeLanguageLabel("f#"), "F#");
  // Same result in the drawer and the standalone page.
  assert.match(renderFilePreview("```c#\nint x;\n```"), /^<pre class="code" data-language="C#"><code class="hljs language-c#">/u);
  assert.match(renderFilePreview("```c++\nint x;\n```"), /^<pre class="code" data-language="C\+\+"><code class="hljs language-c\+\+">/u);
});

test("the article, the preview drawer and the standalone page all label through the shared mapping", () => {
  const article = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(article, /data-language=\{codeLanguageLabel\(language\) \|\| undefined\}/u);
  // One parser for the fence language everywhere; no regex that stops at symbols.
  assert.match(article, /const language = fenceLanguage\(className\);/u);
  assert.doesNotMatch(article, /language-\(\[\\w-\]\+\)/u);
  assert.match(fs.readFileSync(new URL("../scripts/file-preview.mjs", import.meta.url), "utf8"), /fenceLanguage\(/u);
  const ui = fs.readFileSync(new URL("../ui/react/components/media.tsx", import.meta.url), "utf8");
  assert.match(ui, /data-language=\{codeLanguageLabel\(lang\) \|\| undefined\}/u);
  // The drawer and the .preview.html page share one rendering.
  assert.match(renderFilePreview("```py\nx = 1\n```"), /^<pre class="code" data-language="PYTHON">/u);
  assert.match(renderFilePreview("```python\nx = 1\n```"), /^<pre class="code" data-language="PYTHON">/u);
  for (const file of ["../app/components/MarkdownArticle.tsx", "../scripts/file-preview.mjs", "../ui/react/components/media.tsx"]) {
    assert.doesNotMatch(fs.readFileSync(new URL(file, import.meta.url), "utf8"), /language\?*\.toUpperCase\(\)|lang\.toUpperCase\(\)/u, `${file} uppercases on its own`);
  }
});

test("in the article the label sits left of the copy button, 8px apart, centred on it", () => {
  const css = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  const copy = css.match(/\.ux-cb > \.ux-copy,[^{]*\{([^}]*)\}/u)?.[1] ?? "";
  assert.match(copy, /top: 8px;/u);
  assert.match(copy, /right: 8px;/u);
  const button = css.match(/\n\.ux-btn \{([^}]*)\}/u)?.[1] ?? "";
  assert.match(button, /width: 32px;/u);
  assert.match(button, /height: 32px;/u);
  const label = css.match(/\.markdown-body \.ux-cb > pre\[data-language\]::before \{([^}]*)\}/u)?.[1] ?? "";
  // 8px button inset + 32px button + 8px gap.
  assert.match(label, /right: 48px;/u);
  assert.match(label, /top: 8px;/u);
  assert.match(label, /line-height: 32px;/u);
  assert.match(css, /\.markdown-body \.ux-cb:has\(> \.ux-done\) > pre\[data-language\]::before \{\s*visibility: hidden;/u);
  // Below 640px the article shows only the copy button; nothing else about the block changes.
  const narrow = css.match(/@media \(max-width: 639\.98px\) \{\s*\.markdown-body \.ux-cb > pre\[data-language\]::before \{([^}]*)\}\s*\}/u)?.[1] ?? "";
  assert.equal(narrow.trim(), "display: none;");
});

test("the label is the site's muted text colour, in both themes and in the drawer", () => {
  const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = globals.match(/\.markdown-body pre\[data-language\]::before \{([^}]*)\}/u)?.[1] ?? "";
  assert.match(rule, /color: var\(--muted\);/u);
  // No other rule recolours the label (the drawer and dark mode inherit --muted).
  for (const file of ["../app/globals.css", "../app/styles/a2.css", "../app/styles/shell.css"]) {
    const css = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    for (const [, body] of css.matchAll(/pre\[data-language\]::before \{([^}]*)\}/gu)) {
      const color = body.match(/(?:^|;|\s)color: ([^;]+);/u)?.[1];
      if (color) assert.equal(color, "var(--muted)", `${file}: ${color}`);
    }
  }
});

