#!/usr/bin/env node
/**
 * Derives ground-truth CLI commands, flags, Makefile targets/variables,
 * environment variables, site.config.yaml keys, diagnostic check codes
 * (with severity), and CSS custom property colours directly from the
 * repository source files, then checks docs/handbook/ and app/garden/
 * against those derived facts.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { CATALOG } from "../ui/garden/catalog.mjs";
import {
  ALLOWED_EN_HANDBOOK_CJK,
  ALLOWED_EXTERNAL_FLAGS,
  ALLOWED_NON_ENV_UPPER_SNAKE,
} from "./handbook-allowlist.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function walkFiles(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === ".next") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 1. Derive CLI commands & flags from package.json, bin/garden.mjs, and scripts/ui-cli.mjs
 */
function deriveCliFacts(root = ROOT) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const binNames = new Set(Object.keys(pkg.bin ?? {}));
  const npmScripts = new Set(Object.keys(pkg.scripts ?? {}));

  const gardenBinSource = fs.readFileSync(path.join(root, "bin/garden.mjs"), "utf8");
  const gardenCommands = new Set();
  const gardenFlags = new Set();

  // Extract switch cases from bin/garden.mjs
  for (const match of gardenBinSource.matchAll(/\bcase\s+["']([^"']+)["']\s*:/gu)) {
    const value = match[1];
    if (value.startsWith("-")) {
      gardenFlags.add(value);
    } else {
      gardenCommands.add(value);
    }
  }
  // Extract flags checked via .includes("--...") in bin/garden.mjs
  for (const match of gardenBinSource.matchAll(/\.includes\(\s*["'](--?[a-zA-Z0-9-]+)["']\s*\)/gu)) {
    gardenFlags.add(match[1]);
  }

  // Extract `garden ui` subcommands and flags from scripts/ui-cli.mjs
  const uiCliSource = fs.readFileSync(path.join(root, "scripts/ui-cli.mjs"), "utf8");
  const uiSubcommands = new Set();
  const uiFlags = new Set();

  for (const match of uiCliSource.matchAll(/\bcase\s+["']([^"']+)["']\s*:/gu)) {
    const value = match[1];
    if (value.startsWith("-")) {
      uiFlags.add(value);
    } else {
      uiSubcommands.add(value);
    }
  }
  for (const match of uiCliSource.matchAll(/\b(?:flag|option)\(\s*["']([a-zA-Z0-9-]+)["']\s*\)/gu)) {
    uiFlags.add(`--${match[1]}`);
  }

  const commandArity = deriveCommandArity(root, gardenBinSource);
  const npmScriptCommands = deriveNpmScriptCommands(root, gardenCommands);

  return {
    binNames,
    npmScripts,
    commandArity,
    npmScriptCommands,
    gardenCommands,
    gardenFlags,
    uiSubcommands,
    uiFlags,
    allFlags: new Set([...gardenFlags, ...uiFlags, ...Object.keys(ALLOWED_EXTERNAL_FLAGS)]),
  };
}

/**
 * Derive how many positional arguments each `garden <command>` accepts, from the
 * `case "<command>": runNode("<script>", <args>)` blocks in bin/garden.mjs and,
 * when every argument is forwarded (`rest`), from the script's own
 * `const [, , a, b] = process.argv` destructuring and `if (!a ...)` guard.
 */
function deriveCommandArity(root, gardenBinSource) {
  /** @type {Map<string, { min: number, max: number }>} */
  const arity = new Map();
  const caseRe = /\bcase\s+["']([a-z][a-z0-9:-]*)["']\s*:\s*runNode\(\s*["']([^"']+)["']\s*,\s*(rest|\[[\s\S]*?\])\s*\)/gu;
  for (const match of gardenBinSource.matchAll(caseRe)) {
    const [, command, script, args] = match;
    if (args === "rest") {
      const file = path.join(root, script);
      if (!fs.existsSync(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      const destructure = /const\s*\[\s*,\s*,\s*([^\]]+)\]\s*=\s*process\.argv/u.exec(source);
      if (!destructure) continue;
      const names = destructure[1].split(",").map((n) => n.trim()).filter(Boolean);
      if (names.some((n) => n.startsWith("..."))) continue;
      const required = names.filter((n) => new RegExp(`if\\s*\\(\\s*!${n}\\b`, "u").test(source));
      arity.set(command, { min: required.length, max: names.length });
    } else {
      const indices = [...args.matchAll(/\brest\[(\d+)\](\s*\?\?)?/gu)];
      if (/\.\.\.rest\b/u.test(args)) continue;
      const max = indices.reduce((m, i) => Math.max(m, Number(i[1]) + 1), 0);
      const min = indices.filter((i) => !i[2]).reduce((m, i) => Math.max(m, Number(i[1]) + 1), 0);
      arity.set(command, { min, max });
    }
  }
  return arity;
}

/**
 * Map npm scripts in package.json and templates/site/package.json that call a
 * garden command (`garden <cmd>` or `node bin/garden.mjs <cmd>`) to that command,
 * so `npm run <script> -- <args>` gets the same argument checks.
 */
function deriveNpmScriptCommands(root, gardenCommands) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const rel of ["package.json", "templates/site/package.json"]) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const scripts = JSON.parse(fs.readFileSync(file, "utf8")).scripts ?? {};
    for (const [name, command] of Object.entries(scripts)) {
      const match = /^(?:garden|node\s+bin\/garden\.mjs)\s+([a-z][a-z0-9:-]*)\s*$/u.exec(String(command));
      if (match && gardenCommands.has(match[1])) map.set(name, match[1]);
    }
  }
  return map;
}

/**
 * 2. Derive Makefile targets and variables from templates/site/Makefile (and root Makefile)
 */
function deriveMakefileFacts(root = ROOT) {
  const targets = new Set();
  const variables = new Set(["MAKE"]);

  for (const rel of ["templates/site/Makefile", "templates/site/Makefile.en", "Makefile"]) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/u)) {
      const phony = /^\.PHONY:\s*(.+)$/u.exec(line);
      if (phony) {
        for (const token of phony[1].trim().split(/\s+/u)) {
          if (token) targets.add(token);
        }
        continue;
      }
      const targetMatch = /^([a-zA-Z0-9_-]+)\s*:/u.exec(line);
      if (targetMatch && targetMatch[1] !== ".PHONY") {
        targets.add(targetMatch[1]);
      }
      const varDef = /^([A-Z][A-Z0-9_]*)\s*[?:]?=/u.exec(line);
      if (varDef) {
        variables.add(varDef[1]);
      }
      for (const ref of line.matchAll(/\$\(([A-Z][A-Z0-9_]*)\)/gu)) {
        variables.add(ref[1]);
      }
    }
  }
  return { targets, variables };
}

/**
 * 3. Derive environment variables read anywhere in app/, scripts/, ui/, bin/,
 *    worker/, next.config.ts, .env.example, templates/, and .github/workflows/
 */
function deriveEnvVars(root = ROOT) {
  const envVars = new Set();
  const codeDirs = ["app", "scripts", "ui", "bin", "worker"];
  const codeFiles = [
    ...codeDirs.flatMap((dir) =>
      walkFiles(
        path.join(root, dir),
        (f) => /\.(?:mjs|cjs|js|ts|tsx)$/u.test(f) && path.basename(f) !== "handbook-facts.mjs" && path.basename(f) !== "handbook-allowlist.mjs",
      ),
    ),
    path.join(root, "next.config.ts"),
  ].filter((f) => fs.existsSync(f));

  for (const file of codeFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/\b(?:process\.env|env)\.([A-Z][A-Z0-9_]*)\b/gu)) {
      envVars.add(match[1]);
    }
    for (const match of text.matchAll(/\b(?:process\.env|env)\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/gu)) {
      envVars.add(match[1]);
    }
    // Dynamic prefix patterns such as `process.env[\`GARDEN_NEW_${name}\`]` + `option("TITLE")`
    const prefixMatch = /process\.env\[\s*`([A-Z0-9_]+)\$\{/u.exec(text);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      for (const opt of text.matchAll(/\boption\(\s*["']([A-Z0-9_]+)["']\s*\)/gu)) {
        envVars.add(`${prefix}${opt[1]}`);
      }
    }
  }

  // .env.example & .env.en.example
  for (const envRel of [".env.example", ".env.en.example"]) {
    const envExample = path.join(root, envRel);
    if (fs.existsSync(envExample)) {
      const text = fs.readFileSync(envExample, "utf8");
      for (const match of text.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gmu)) {
        envVars.add(match[1]);
      }
    }
  }

  // GitHub workflows and template Makefiles
  const workflowFiles = [
    ...walkFiles(path.join(root, ".github/workflows"), (f) => /\.ya?ml$/u.test(f)),
    ...walkFiles(path.join(root, "templates"), (f) => /\.ya?ml$|Makefile(?:\.en)?$/u.test(f)),
  ];
  for (const file of workflowFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/\b(?:vars|secrets|env)\.([A-Z][A-Z0-9_]*)\b/gu)) {
      envVars.add(match[1]);
    }
    for (const match of text.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*:/gmu)) {
      envVars.add(match[1]);
    }
    for (const match of text.matchAll(/\b([A-Z][A-Z0-9_]+)=/gu)) {
      envVars.add(match[1]);
    }
  }

  return envVars;
}

/**
 * 4. Derive site.config.yaml keys from app/site.config.ts, app/lib/fallback-site-config.ts,
 *    scripts/brand.mjs, scripts/redirects.mjs, ui/garden/same-site.mjs,
 *    templates/site/site.config.yaml, and site.config.yaml
 */
function deriveSiteConfigKeys(root = ROOT) {
  const keyPaths = new Set();
  const leafKeys = new Set();

  function walkYamlObject(obj, prefix = "") {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) walkYamlObject(item, prefix);
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      // Do not treat arbitrary redirect path keys (like `/2024/...`) as schema keys
      if (prefix === "redirects" && k.startsWith("/")) continue;
      const next = prefix ? `${prefix}.${k}` : k;
      keyPaths.add(next);
      leafKeys.add(k);
      walkYamlObject(v, next);
    }
  }

  for (const rel of ["templates/site/site.config.yaml", "templates/site/site.config.en.yaml", "site.config.yaml"]) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    walkYamlObject(parseYaml(text));
    // Optional keys the template documents as comments (`# url: ...`, `# brand:` + `#   logo: ...`).
    const uncommented = text
      .split(/\r?\n/u)
      .filter((line) => /^#\s?(\s*)[a-zA-Z][a-zA-Z0-9_]*:/u.test(line))
      .map((line) => line.replace(/^#\s?/u, ""))
      .join("\n");
    try {
      walkYamlObject(parseYaml(uncommented));
    } catch {
      // Commented lines that do not form valid YAML on their own are skipped.
    }
  }

  // Also parse TypeScript interfaces & property accesses in app/site.config.ts, scripts/brand.mjs, scripts/redirects.mjs
  const configLoaderSource = fs.readFileSync(path.join(root, "app/site.config.ts"), "utf8");
  for (const match of configLoaderSource.matchAll(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\??\s*:/gmu)) {
    leafKeys.add(match[1]);
  }
  const brandSource = fs.readFileSync(path.join(root, "scripts/brand.mjs"), "utf8");
  for (const match of brandSource.matchAll(/\bbrand\.([a-zA-Z][a-zA-Z0-9_]*)\b/gu)) {
    leafKeys.add("brand");
    leafKeys.add(match[1]);
    keyPaths.add(`brand.${match[1]}`);
  }
  const redirectsSource = fs.readFileSync(path.join(root, "ui/garden/internal-links.mjs"), "utf8");
  if (redirectsSource.includes("config?.redirects") || redirectsSource.includes("config.redirects")) {
    leafKeys.add("redirects");
    keyPaths.add("redirects");
  }

  return { keyPaths, leafKeys };
}

/**
 * 5. Derive check diagnostic codes (and their severities) from scripts/check-post.mjs,
 *    ui/garden/check.mjs, ui/garden/file-paths.mjs, ui/garden/parse.mjs,
 *    ui/core/validate.mjs, and ui/core/parse.mjs
 */
function deriveCheckCodes(root = ROOT) {
  /** @type {Map<string, Set<"error" | "warning">>} */
  const codes = new Map();
  const record = (code, severity = "error") => {
    if (!codes.has(code)) codes.set(code, new Set());
    codes.get(code).add(severity);
  };

  // scripts/check-post.mjs: error(errors, "code", ...) and warnings.push({ code: "..." })
  const checkPostSource = fs.readFileSync(path.join(root, "scripts/check-post.mjs"), "utf8");
  for (const match of checkPostSource.matchAll(/\berror\(\s*errors\s*,\s*["']([a-z0-9-]+)["']/gu)) {
    record(match[1], "error");
  }
  for (const match of checkPostSource.matchAll(/\bwarnings\.push\(\s*\{\s*code:\s*["']([a-z0-9-]+)["']/gu)) {
    record(match[1], "warning");
  }

  // ui/garden/check.mjs: push(line, "code", message, suggestion, severity?)
  const gardenCheckSource = fs.readFileSync(path.join(root, "ui/garden/check.mjs"), "utf8");
  for (const match of gardenCheckSource.matchAll(/\bpush\(\s*[^,\n]+\s*,\s*["']([a-z0-9-]+)["']([\s\S]*?)\)\s*;/gu)) {
    const rest = match[2];
    const sev = /,\s*["'](warning|error)["']\s*$/u.exec(rest.trim())?.[1] ?? "error";
    record(match[1], sev);
  }

  // ui/garden/file-paths.mjs: code: "..." (with optional severity: "warning" nearby)
  const filePathsSource = fs.readFileSync(path.join(root, "ui/garden/file-paths.mjs"), "utf8");
  for (const match of filePathsSource.matchAll(/\bcode:\s*["']([a-z0-9-]+)["']([\s\S]{0,220})/gu)) {
    const tail = match[2];
    const sev = /severity:\s*["'](warning|error)["']/u.exec(tail)?.[1] ?? "error";
    record(match[1], sev);
  }

  // ui/garden/parse.mjs: error: { code: "..." }
  const gardenParseSource = fs.readFileSync(path.join(root, "ui/garden/parse.mjs"), "utf8");
  for (const match of gardenParseSource.matchAll(/\bcode:\s*["']([a-z0-9-]+)["']/gu)) {
    record(match[1], "error");
  }

  // ui/core/validate.mjs & ui/core/parse.mjs
  for (const rel of ["ui/core/validate.mjs", "ui/core/parse.mjs"]) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    for (const match of text.matchAll(/\b(?:add|report)\(\s*["']([a-z0-9-]+)["']\s*,\s*[^,]+,\s*[^,)]+(?:,\s*["'](error|warning)["'])?\s*\)/gu)) {
      record(match[1], match[2] === "warning" ? "warning" : "error");
    }
  }

  return codes;
}

/**
 * 6. Derive every CSS custom property with its light and dark value from app/styles/tokens.css
 */
function deriveCssTokens(root = ROOT) {
  const source = fs.readFileSync(path.join(root, "app/styles/tokens.css"), "utf8");
  /** @type {Map<string, { light?: string, dark?: string }>} */
  const tokens = new Map();

  const setToken = (name, mode, value) => {
    if (!tokens.has(name)) tokens.set(name, {});
    tokens.get(name)[mode] = value.trim();
  };

  // Match top-level rule blocks in tokens.css
  const lightBlockMatch = /:root,\s*:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/u.exec(source);
  if (lightBlockMatch) {
    for (const prop of lightBlockMatch[1].matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gmu)) {
      setToken(prop[1], "light", prop[2]);
    }
  }

  const darkBlockMatch = /:root\[data-theme="dark"\](?:,\s*html\[data-theme="dark"\])?\s*\{([\s\S]*?)\n\}/u.exec(source);
  if (darkBlockMatch) {
    for (const prop of darkBlockMatch[1].matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gmu)) {
      setToken(prop[1], "dark", prop[2]);
    }
  }

  // Also record layout custom property names defined or set in app/styles/*.css and app/components/*.tsx
  for (const cssFile of [
    ...walkFiles(path.join(root, "app/styles"), (f) => f.endsWith(".css")),
    ...walkFiles(path.join(root, "app/components"), (f) => /\.(?:ts|tsx)$/u.test(f)),
  ]) {
    const text = fs.readFileSync(cssFile, "utf8");
    for (const prop of text.matchAll(/(?:--|setProperty\(\s*["']--)[a-zA-Z0-9-]+/gu)) {
      const name = prop[0].startsWith("setProperty")
        ? /--[a-zA-Z0-9-]+/u.exec(prop[0])[0]
        : prop[0];
      if (!tokens.has(name)) tokens.set(name, {});
    }
  }

  return tokens;
}

/**
 * Build the complete derived fact set from the repository source.
 */
export function deriveHandbookFacts(root = ROOT) {
  const cli = deriveCliFacts(root);
  const makefile = deriveMakefileFacts(root);
  const envVars = deriveEnvVars(root);
  const siteConfig = deriveSiteConfigKeys(root);
  const checkCodes = deriveCheckCodes(root);
  const cssTokens = deriveCssTokens(root);
  const gardenComponents = new Set(Object.keys(CATALOG));

  return {
    cli,
    makefile,
    envVars,
    siteConfig,
    checkCodes,
    cssTokens,
    gardenComponents,
  };
}

/**
 * Parse a markdown document into lines and fenced code blocks (supporting 3+ backticks/tildes).
 */
function parseMarkdownRegions(markdown) {
  const lines = String(markdown).split(/\r?\n/u);
  const fences = [];
  const lineInFence = new Array(lines.length).fill(null);

  let open = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(line);
    if (open) {
      const closer =
        match &&
        match[2][0] === open.marker[0] &&
        match[2].length >= open.marker.length &&
        !match[3].trim();
      if (closer) {
        open.endLine = i + 1;
        fences.push(open);
        lineInFence[i] = open;
        open = null;
      } else {
        open.bodyLines.push({ lineNumber: i + 1, text: line });
        lineInFence[i] = open;
      }
      continue;
    }
    if (match) {
      const info = match[3].trim();
      const lang = (info.split(/\s+/u)[0] ?? "").toLowerCase();
      open = {
        marker: match[2],
        info,
        lang,
        startLine: i + 1,
        endLine: lines.length,
        bodyLines: [],
      };
      lineInFence[i] = open;
    }
  }
  return { lines, fences, lineInFence };
}

/**
 * Extract inline `code` spans from a single non-fence line.
 */
function extractInlineCodeSpans(line) {
  const spans = [];
  const re = /(`+)([^`]+?)\1/gu;
  let match;
  while ((match = re.exec(line)) !== null) {
    spans.push(match[2].trim());
  }
  return spans;
}

/**
 * Compare the positional arguments of a garden command with the derived arity.
 */
function checkArity(command, args, segment, file, lineNumber, facts, issues) {
  const arity = facts.cli.commandArity.get(command);
  if (!arity) return;
  const positional = args.filter((arg) => !arg.startsWith("-") && !arg.startsWith("#") && !/^[<>|]/u.test(arg));
  if (positional.length < arity.min || positional.length > arity.max) {
    const range = arity.min === arity.max ? `${arity.max}` : `${arity.min}-${arity.max}`;
    issues.push({
      file,
      line: lineNumber,
      kind: "cli-arity",
      message: `"garden ${command}" takes ${range} positional argument(s), got ${positional.length} in "${segment}"`,
    });
  }
}

/**
 * Validate a shell command string (from a bash/sh fence or an inline code span).
 */
function checkCommandString(cmdText, file, lineNumber, facts, issues) {
  // Split compound commands on &&, ||, ;, or newline
  const segments = cmdText
    .split(/(?:&&|\|\||;|\r?\n)/u)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));

  for (const segment of segments) {
    // Strip leading VAR=val assignments (e.g. STATIC_EXPORT=1 npm run build)
    const tokens = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/gu) ?? [];
    let idx = 0;
    const assignedVars = [];
    while (idx < tokens.length && /^([A-Z][A-Z0-9_]*)=/u.test(tokens[idx])) {
      const varName = /^([A-Z][A-Z0-9_]*)=/u.exec(tokens[idx])[1];
      assignedVars.push(varName);
      idx += 1;
    }
    if (idx >= tokens.length) continue;

    const head = tokens[idx];
    const rest = tokens.slice(idx + 1);

    // Check leading env var assignments
    for (const varName of assignedVars) {
      if (!facts.envVars.has(varName) && !facts.makefile.variables.has(varName)) {
        issues.push({
          file,
          line: lineNumber,
          kind: "env-var",
          message: `Unknown environment/Makefile variable "${varName}" in command "${segment}"`,
        });
      }
    }

    // Check `npx garden ...` / `npx hd-garden ...` / `garden ...` / `hd-garden ...`
    let gardenArgs = null;
    if (head === "npx" && rest.length > 0) {
      const pkgOrBin = rest[0].replace(/@[0-9a-zA-Z._-]+$/u, "");
      if (facts.cli.binNames.has(pkgOrBin)) {
        gardenArgs = rest.slice(1);
      }
    } else if (facts.cli.binNames.has(head)) {
      gardenArgs = rest;
    }

    if (gardenArgs !== null) {
      const sub = gardenArgs[0];
      if (!sub) continue;
      // In inline prose, `garden stat` / `garden file` / `garden <name>` etc. (without `npx`)
      // can be a Markdown fence header reference (` ```garden stat `) when `sub` is a known component name
      // or a `<name>` placeholder and there are no extra args or only `#id`.
      if (
        head === "garden" &&
        (facts.gardenComponents.has(sub) || /^(?:<[^>]+>|\$\{[^}]+\})$/u.test(sub)) &&
        (gardenArgs.length === 1 || (gardenArgs.length === 2 && gardenArgs[1].startsWith("#")))
      ) {
        continue;
      }
      if (sub.startsWith("-")) {
        if (!facts.cli.gardenFlags.has(sub)) {
          issues.push({
            file,
            line: lineNumber,
            kind: "cli-flag",
            message: `Unknown garden CLI flag "${sub}" in "${segment}"`,
          });
        }
        continue;
      }
      if (!facts.cli.gardenCommands.has(sub)) {
        issues.push({
          file,
          line: lineNumber,
          kind: "cli-command",
          message: `Unknown garden CLI subcommand "${sub}" in "${segment}"`,
        });
        continue;
      }
      if (sub === "ui") {
        const uiSub = gardenArgs[1];
        if (uiSub && !uiSub.startsWith("-") && !facts.cli.uiSubcommands.has(uiSub)) {
          issues.push({
            file,
            line: lineNumber,
            kind: "cli-command",
            message: `Unknown "garden ui" subcommand "${uiSub}" in "${segment}"`,
          });
        }
        for (const arg of gardenArgs.slice(2)) {
          if (arg.startsWith("-")) {
            const flagName = arg.split("=", 1)[0];
            if (!facts.cli.uiFlags.has(flagName)) {
              issues.push({
                file,
                line: lineNumber,
                kind: "cli-flag",
                message: `Unknown "garden ui" flag "${flagName}" in "${segment}"`,
              });
            }
          }
        }
      } else {
        checkArity(sub, gardenArgs.slice(1), segment, file, lineNumber, facts, issues);
        for (const arg of gardenArgs.slice(1)) {
          if (arg === "--") break;
          if (arg.startsWith("-")) {
            const flagName = arg.split("=", 1)[0];
            if (!facts.cli.gardenFlags.has(flagName)) {
              issues.push({
                file,
                line: lineNumber,
                kind: "cli-flag",
                message: `Unknown "garden ${sub}" flag "${flagName}" in "${segment}"`,
              });
            }
          }
        }
      }
      continue;
    }

    // Check `make ...`
    if (head === "make") {
      for (const rawArg of rest) {
        const arg = rawArg.replace(/^\[|\]$/gu, "");
        if (!arg || arg.startsWith("-")) continue;
        const varAssign = /^([A-Za-z0-9_]+)=/u.exec(arg);
        if (varAssign) {
          const varName = varAssign[1];
          if (!facts.makefile.variables.has(varName) && !facts.envVars.has(varName)) {
            issues.push({
              file,
              line: lineNumber,
              kind: "make-var",
              message: `Unknown Makefile variable "${varName}" in "${segment}"`,
            });
          }
        } else if (!facts.makefile.targets.has(arg)) {
          issues.push({
            file,
            line: lineNumber,
            kind: "make-target",
            message: `Unknown Makefile target "make ${arg}" in "${segment}"`,
          });
        }
      }
      continue;
    }

    // Check `npm run <script>`
    if (head === "npm" && rest[0] === "run" && rest[1]) {
      const scriptName = rest[1];
      const gardenCommand = facts.cli.npmScriptCommands.get(scriptName);
      if (gardenCommand) {
        const dashIdx = rest.indexOf("--");
        const extra = dashIdx === -1 ? [] : rest.slice(dashIdx + 1);
        checkArity(gardenCommand, extra, segment, file, lineNumber, facts, issues);
      }
      if (!facts.cli.npmScripts.has(scriptName) && !gardenCommand) {
        issues.push({
          file,
          line: lineNumber,
          kind: "npm-script",
          message: `Unknown npm script "npm run ${scriptName}" in "${segment}"`,
        });
      }
    }
  }
}

const SHELL_FENCE_LANGS = new Set(["bash", "sh", "shell", "zsh", "console", "text", "txt", "plaintext", ""]);

/**
 * Check every shell line under a `run:` key in a GitHub Actions workflow fence.
 */
function checkWorkflowRunLines(fence, relFile, facts, issues) {
  let runIndent = null;
  for (const item of fence.bodyLines) {
    const text = item.text;
    const indent = /^\s*/u.exec(text)[0].length;
    if (runIndent !== null) {
      if (!text.trim()) continue;
      if (indent > runIndent) {
        const trimmed = text.trim();
        if (!trimmed.startsWith("#")) checkCommandString(trimmed, relFile, item.lineNumber, facts, issues);
        continue;
      }
      runIndent = null;
    }
    const run = /^(\s*)(?:-\s+)?run:\s*(.*)$/u.exec(text);
    if (!run) continue;
    const value = run[2].trim();
    if (/^[|>][+-]?$/u.test(value)) {
      runIndent = indent + (text.trimStart().startsWith("-") ? 2 : 0);
    } else if (value && !value.startsWith("#")) {
      checkCommandString(value.replace(/^(["'])(.*)\1$/u, "$2"), relFile, item.lineNumber, facts, issues);
    }
  }
}

/**
 * Validate a single markdown or source file against derived handbook facts.
 */
export function checkFileFacts(filePath, content, facts, root = ROOT) {
  const relFile = path.relative(root, filePath).split(path.sep).join("/");
  const issues = [];
  const { lines, fences, lineInFence } = parseMarkdownRegions(content);

  // 1. Check fenced blocks
  for (const fence of fences) {
    const lang = fence.lang;
    const bodyText = fence.bodyLines.map((l) => l.text).join("\n");

    // Shell fences (bash, sh, shell, zsh) and terminal transcripts (console, text, plain fences)
    if (SHELL_FENCE_LANGS.has(lang)) {
      for (const item of fence.bodyLines) {
        const trimmed = item.text.trim().replace(/^[$>%]\s+/u, "");
        if (!trimmed || trimmed.startsWith("#")) continue;
        checkCommandString(trimmed, relFile, item.lineNumber, facts, issues);
      }
    }

    // YAML fences that represent site.config.yaml (not GitHub Actions workflows, not frontmatter)
    if (lang === "yaml" || lang === "yml") {
      const isWorkflow =
        /\b(?:runs-on|steps|jobs|workflow_dispatch|actions\/checkout)\b/u.test(bodyText);
      const isColumnsYaml = /^columns:\s*$/mu.test(bodyText) && /^\s*-\s+slug:/mu.test(bodyText);
      const isFrontmatter = /^\s*---\s*$/mu.test(bodyText) || (/\bdraft:/u.test(bodyText) && /\btags:/u.test(bodyText));

      if (isWorkflow) {
        checkWorkflowRunLines(fence, relFile, facts, issues);
      }

      if (!isWorkflow && !isColumnsYaml && !isFrontmatter) {
        try {
          const parsed = parseYaml(bodyText);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const checkYamlObj = (obj, prefix = "") => {
              for (const [k, v] of Object.entries(obj)) {
                if (prefix === "redirects" && k.startsWith("/")) continue;
                const keyPath = prefix ? `${prefix}.${k}` : k;
                if (!facts.siteConfig.keyPaths.has(keyPath)) {
                  const keyLine =
                    fence.bodyLines.find((l) => new RegExp(`^\\s*${k}\\s*:`, "u").test(l.text))?.lineNumber ??
                    fence.startLine;
                  issues.push({
                    file: relFile,
                    line: keyLine,
                    kind: "config-key",
                    message: `Unknown site.config.yaml key "${keyPath}"`,
                  });
                }
                if (v && typeof v === "object" && !Array.isArray(v)) {
                  checkYamlObj(v, keyPath);
                }
              }
            };
            checkYamlObj(parsed);
          }
        } catch {
          // Non-object YAML snippet; ignore here
        }
      }
    }
  }

  // 2. Scan lines outside fences (and inside markdown fences only when appropriate)
  let inCheckTable = false;
  let inTokenColorTable = false;
  let tokenTableCols = null;

  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const line = lines[i];
    const activeFence = lineInFence[i];

    // Skip lines inside fenced code blocks for prose/table checks
    if (activeFence) continue;

    const spans = extractInlineCodeSpans(line);

    // Check inline shell commands and standalone flags
    for (const span of spans) {
      if (
        /^(?:npx\s+(?:hd-)?garden|garden|hd-garden|make|npm\s+run)\b/u.test(span) ||
        /^[A-Z][A-Z0-9_]*=\S+\s+(?:npx|garden|make|npm)\b/u.test(span)
      ) {
        checkCommandString(span, relFile, lineNumber, facts, issues);
      } else if (/^--[a-z][a-z0-9-]*$/u.test(span)) {
        // Ignore CSS custom properties (--paper, --ink, --wl, --wr, etc.)
        if (!facts.cssTokens.has(span) && !["--wl", "--wr", "--col"].includes(span)) {
          if (!facts.cli.allFlags.has(span)) {
            issues.push({
              file: relFile,
              line: lineNumber,
              kind: "cli-flag",
              message: `Unknown CLI flag "${span}"`,
            });
          }
        }
      }

      // Check UPPER_SNAKE environment variable names in inline code
      if (/^[A-Z][A-Z0-9_]{2,}$/u.test(span) && span.includes("_")) {
        if (
          !facts.envVars.has(span) &&
          !facts.makefile.variables.has(span) &&
          !Object.hasOwn(ALLOWED_NON_ENV_UPPER_SNAKE, span)
        ) {
          issues.push({
            file: relFile,
            line: lineNumber,
            kind: "env-var",
            message: `Unknown UPPER_SNAKE environment variable "${span}"`,
          });
        }
      }
    }

    // Detect table headers
    if (/^\s*\|/u.test(line)) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      if (cells.some((c) => /诊断码|代码|Code/iu.test(c)) && cells.some((c) => /级别|触发|Severity/iu.test(c))) {
        inCheckTable = true;
        inTokenColorTable = false;
        continue;
      }
      if (
        cells.some((c) => /变量|Token/iu.test(c)) &&
        cells.some((c) => /浅色|亮色|Light/iu.test(c)) &&
        cells.some((c) => /深色|暗色|Dark/iu.test(c))
      ) {
        inTokenColorTable = true;
        inCheckTable = false;
        tokenTableCols = {
          tokenIdx: cells.findIndex((c) => /变量|Token/iu.test(c)),
          lightIdx: cells.findIndex((c) => /浅色|亮色|Light/iu.test(c)),
          darkIdx: cells.findIndex((c) => /深色|暗色|Dark/iu.test(c)),
        };
        continue;
      }
      // Separator row `| --- | --- |`
      if (cells.every((c) => /^:?-+:?$/u.test(c))) {
        continue;
      }

      if (inCheckTable && cells.length >= 2) {
        const codeSpans = extractInlineCodeSpans(cells[0]);
        const severityText = cells[1];
        for (const code of codeSpans) {
          if (!facts.checkCodes.has(code)) {
            issues.push({
              file: relFile,
              line: lineNumber,
              kind: "check-code",
              message: `Unknown check diagnostic code "${code}"`,
            });
          } else {
            const actualSeverities = facts.checkCodes.get(code);
            if (/错误|error/iu.test(severityText) && !actualSeverities.has("error")) {
              issues.push({
                file: relFile,
                line: lineNumber,
                kind: "check-severity",
                message: `Check code "${code}" is documented as error ("${severityText}"), but source emits ${[...actualSeverities].join("/")}`,
              });
            } else if (/警告|warning/iu.test(severityText) && !actualSeverities.has("warning")) {
              issues.push({
                file: relFile,
                line: lineNumber,
                kind: "check-severity",
                message: `Check code "${code}" is documented as warning ("${severityText}"), but source emits ${[...actualSeverities].join("/")}`,
              });
            }
          }
        }
      }

      if (inTokenColorTable && tokenTableCols) {
        const tokenCell = cells[tokenTableCols.tokenIdx] ?? "";
        const lightCell = cells[tokenTableCols.lightIdx] ?? "";
        const darkCell = cells[tokenTableCols.darkIdx] ?? "";
        const tokenNames = [...tokenCell.matchAll(/--[a-zA-Z0-9-]+/gu)].map((m) => m[0]);
        const lightHexes = [...lightCell.matchAll(/#[0-9a-fA-F]{6}\b/gu)].map((m) => m[0].toLowerCase());
        const darkHexes = [...darkCell.matchAll(/#[0-9a-fA-F]{6}\b/gu)].map((m) => m[0].toLowerCase());

        tokenNames.forEach((tokenName, idx) => {
          const actual = facts.cssTokens.get(tokenName);
          if (!actual) {
            issues.push({
              file: relFile,
              line: lineNumber,
              kind: "css-token",
              message: `Unknown CSS custom property "${tokenName}" (not in app/styles/tokens.css)`,
            });
            return;
          }
          const lightHex = lightHexes[idx] ?? lightHexes[0];
          const darkHex = darkHexes[idx] ?? darkHexes[0];
          if (lightHex && actual.light?.toLowerCase() !== lightHex) {
            issues.push({
              file: relFile,
              line: lineNumber,
              kind: "css-color",
              message: `CSS token "${tokenName}" light value documented as "${lightHex}", but tokens.css has "${actual.light}"`,
            });
          }
          if (darkHex && actual.dark?.toLowerCase() !== darkHex) {
            issues.push({
              file: relFile,
              line: lineNumber,
              kind: "css-color",
              message: `CSS token "${tokenName}" dark value documented as "${darkHex}", but tokens.css has "${actual.dark}"`,
            });
          }
        });
      }
    } else {
      inCheckTable = false;
      inTokenColorTable = false;
      tokenTableCols = null;
    }

    // Also check prose lines that mention check codes or `--token` + `#hex` pairs
    if (/(?:报|提示|触发|警告|错误|拦截|check)\b|报\s*`|`[a-z]+-[a-z-]+`\s*(?:错误|警告)/u.test(line)) {
      for (const span of spans) {
        if (/^[a-z]+-[a-z0-9-]+$/u.test(span)) {
          // Ignore known non-check hyphenated terms (like github-pages, hd-garden, prefers-color-scheme, etc.)
          const nonCheckTerms = new Set([
            "hd-garden",
            "github-pages",
            "prefers-color-scheme",
            "color-scheme",
            "font-family",
            "line-height",
            "max-width",
            "min-width",
            "margin-left",
            "margin-right",
            "data-theme",
            "data-p",
            "data-sel",
            "aria-label",
            "content-type",
            "user-agent",
          ]);
          if (nonCheckTerms.has(span) || facts.cli.allFlags.has(`--${span}`)) continue;
          // Only treat as check code when explicitly paired with 报/警告/错误/拦截 or known prefix
          const isExplicitCheckMention =
            new RegExp(`(?:报|触发|抛出|返回|拦截)\\s*\`${span}\`|\`${span}\`\\s*(?:错误|警告)`, "u").test(line);
          if (isExplicitCheckMention) {
            if (!facts.checkCodes.has(span)) {
              issues.push({
                file: relFile,
                line: lineNumber,
                kind: "check-code",
                message: `Unknown check diagnostic code "${span}" in prose`,
              });
            } else {
              const actualSeverities = facts.checkCodes.get(span);
              if (new RegExp(`\`${span}\`\\s*错误`, "u").test(line) && !actualSeverities.has("error")) {
                issues.push({
                  file: relFile,
                  line: lineNumber,
                  kind: "check-severity",
                  message: `Check code "${span}" called "错误" in prose, but source emits ${[...actualSeverities].join("/")}`,
                });
              }
              if (new RegExp(`\`${span}\`\\s*警告`, "u").test(line) && !actualSeverities.has("warning")) {
                issues.push({
                  file: relFile,
                  line: lineNumber,
                  kind: "check-severity",
                  message: `Check code "${span}" called "警告" in prose, but source emits ${[...actualSeverities].join("/")}`,
                });
              }
            }
          }
        }
      }
    }

    // `--token: #hex` written inside a single code span
    for (const span of spans) {
      const pair = /^(--[a-zA-Z0-9-]+)\s*[:：=]\s*(#[0-9a-fA-F]{6})\b/u.exec(span);
      if (!pair) continue;
      const actual = facts.cssTokens.get(pair[1]);
      const hex = pair[2].toLowerCase();
      if (!actual) {
        issues.push({ file: relFile, line: lineNumber, kind: "css-token", message: `Unknown CSS custom property "${pair[1]}"` });
      } else if (![actual.light, actual.dark].filter(Boolean).map((v) => v.toLowerCase()).includes(hex)) {
        issues.push({
          file: relFile,
          line: lineNumber,
          kind: "css-color",
          message: `CSS token "${pair[1]}" written as "${hex}", which matches neither light (${actual.light}) nor dark (${actual.dark}) in tokens.css`,
        });
      }
    }

    // Prose `--token` + `#hex` on the same line (when a single token is paired with a hex value)
    if (!inTokenColorTable) {
      const tokenMatches = [...line.matchAll(/`(--[a-zA-Z0-9-]+)`/gu)].map((m) => m[1]);
      const hexMatches = [...line.matchAll(/`(#[0-9a-fA-F]{6})`/gu)].map((m) => m[1].toLowerCase());
      if (tokenMatches.length === 1 && hexMatches.length >= 1) {
        const tokenName = tokenMatches[0];
        if (!["--wl", "--wr", "--col"].includes(tokenName)) {
          const actual = facts.cssTokens.get(tokenName);
          if (!actual) {
            issues.push({
              file: relFile,
              line: lineNumber,
              kind: "css-token",
              message: `Unknown CSS custom property "${tokenName}"`,
            });
          } else {
            const validHexes = new Set(
              [actual.light?.toLowerCase(), actual.dark?.toLowerCase()].filter(Boolean),
            );
            for (const hex of hexMatches) {
              if (!validHexes.has(hex)) {
                issues.push({
                  file: relFile,
                  line: lineNumber,
                  kind: "css-color",
                  message: `CSS token "${tokenName}" paired with "${hex}", which matches neither light (${actual.light}) nor dark (${actual.dark}) in tokens.css`,
                });
              }
            }
          }
        }
      }
    }
  }

  return issues;
}

/**
 * English pages mirror the Chinese ones: docs/handbook/en/<path>.md must have
 * docs/handbook/<path>.md with the same section and order. Chinese pages without
 * an English twin are fine (not translated yet).
 */
export function checkHandbookPairs(root = ROOT) {
  const handbook = path.join(root, "docs/handbook");
  const enRoot = path.join(handbook, "en");
  const issues = [];
  const head = (text) => {
    const m = text.match(/^---\n([\s\S]*?)\n---/u);
    const field = (key) => m?.[1].match(new RegExp(`^${key}:\\s*(.+)$`, "mu"))?.[1].trim();
    return { section: field("section"), order: field("order") };
  };
  for (const file of walkFiles(enRoot, (f) => f.endsWith(".md"))) {
    const rel = path.relative(enRoot, file);
    const zhFile = path.join(handbook, rel);
    const relEn = path.relative(root, file).replace(/\\/g, "/");
    if (!fs.existsSync(zhFile)) {
      issues.push({ file: relEn, line: 1, kind: "handbook-pair", message: `no Chinese counterpart docs/handbook/${rel.replace(/\\/g, "/")}` });
      continue;
    }
    const en = head(fs.readFileSync(file, "utf8"));
    const zh = head(fs.readFileSync(zhFile, "utf8"));
    for (const key of ["section", "order"]) {
      if (en[key] !== zh[key]) {
        issues.push({ file: relEn, line: 1, kind: "handbook-pair", message: `${key} is ${en[key] ?? "missing"}, the Chinese page has ${zh[key] ?? "missing"}` });
      }
    }
  }
  return issues;
}

const CJK_RE = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/gu;

function findDisallowedEnCjk(line, { allowTitleSplit = false } = {}) {
  const disallowed = [];
  for (const match of line.matchAll(CJK_RE)) {
    const ch = match[0];
    if (allowTitleSplit && ALLOWED_EN_HANDBOOK_CJK.titleSplitChars.has(ch)) continue;
    disallowed.push(ch);
  }
  return disallowed;
}

/**
 * Extract local relative file paths included or embedded by an English handbook Markdown page
 * (Markdown images, HTML media tags, and `garden file` / `garden figure` / `garden html` fences).
 */
function extractIncludedHandbookFiles(markdown, mdFile, root = ROOT) {
  const handbookRoot = path.join(root, "docs/handbook");
  const baseDir = path.dirname(mdFile);
  const included = new Set();

  const addIfLocal = (rawRef) => {
    if (!rawRef || typeof rawRef !== "string") return;
    const cleaned = rawRef.trim().replace(/^<|>$/gu, "").split(/[?#]/u, 1)[0];
    if (!cleaned || /^(?:[a-z]+:)?\/\//iu.test(cleaned) || cleaned.startsWith("/") || cleaned.startsWith("#") || cleaned.startsWith("data:")) {
      return;
    }
    const resolved = path.resolve(baseDir, decodeURIComponent(cleaned));
    const relToHandbook = path.relative(handbookRoot, resolved);
    if (!relToHandbook.startsWith("..") && !path.isAbsolute(relToHandbook) && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      included.add(resolved);
    }
  };

  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/gu)) {
    addIfLocal(match[1].trim().split(/\s+/u, 1)[0]);
  }
  for (const match of markdown.matchAll(/<(?:img|audio|video|source)\b[^>]*\bsrc=["']([^"']+)["']/giu)) {
    addIfLocal(match[1]);
  }
  const { fences } = parseMarkdownRegions(markdown);
  for (const fence of fences) {
    if (!fence.info.startsWith("garden ")) continue;
    const bodyText = fence.bodyLines.map((l) => l.text).join("\n");
    for (const srcMatch of bodyText.matchAll(/^\s*(?:-\s*)?(?:src|image)\s*:\s*(.+)$/gmu)) {
      addIfLocal(srcMatch[1].replace(/^(["'])(.*)\1$/u, "$2"));
    }
  }
  return [...included];
}

/**
 * Strip the narrow, line-specific `"全部"` config value exception when checking
 * `docs/handbook/en/components/figure.md` on the `parts[].id` field row.
 */
function stripAllowedFigureAllKeywordInLine(relFile, line) {
  const rule = ALLOWED_EN_HANDBOOK_CJK.figureAllKeyword;
  if (relFile === rule.file && rule.linePattern.test(line)) {
    return line.replaceAll(`\`${rule.literal}\``, "").replaceAll(rule.literal, "");
  }
  return line;
}

/**
 * Strip the narrow, row-specific `<code>"全部"</code>` config value exception when
 * checking built HTML for `/garden/en/components/figure` on the `parts[].id` table row.
 */
export function stripAllowedFigureAllKeywordInHtml(html, pageLabel = "") {
  const rule = ALLOWED_EN_HANDBOOK_CJK.figureAllKeyword;
  if (!rule.routePattern.test(String(pageLabel))) return String(html);
  return String(html).replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/giu, (tr) => {
    if (!/<code>parts\[\]\.id<\/code>/u.test(tr)) return tr;
    return tr.replace(/<code>(?:"|&quot;)全部(?:"|&quot;)<\/code>/gu, '<code>"all"</code>');
  });
}

/**
 * Every English handbook page under docs/handbook/en/ (including fenced code blocks and
 * any included/embedded files) must not contain CJK characters, except the explicit allowlist.
 * Note: This static check inspects Markdown source, embedded assets, and pre-rendered HTML files;
 * it does not cover client-side runtime rendering or hydration (which is verified by browser tests).
 */
export function checkEnglishHandbookNoCjk(root = ROOT) {
  const enRoot = path.join(root, "docs/handbook/en");
  if (!fs.existsSync(enRoot)) return [];
  const issues = [];
  const checkedAssets = new Set();

  const checkFileLines = (filePath, allowTitleSplit = false) => {
    const relFile = path.relative(root, filePath).replace(/\\/g, "/");
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lineAllowSplit = allowTitleSplit && /(?:title|split|delimiter|heading|two-line|` \| `)/iu.test(line);
      const scannedLine = stripAllowedFigureAllKeywordInLine(relFile, line);
      const bad = findDisallowedEnCjk(scannedLine, { allowTitleSplit: lineAllowSplit });
      if (bad.length > 0) {
        const sample = [...new Set(bad)].slice(0, 8).join("");
        issues.push({
          file: relFile,
          line: i + 1,
          kind: "en-cjk",
          message: `English handbook contains CJK character(s) "${sample}": ${line.trim().slice(0, 80)}`,
        });
      }
    }
  };

  const enFiles = walkFiles(enRoot);
  for (const file of enFiles) {
    checkedAssets.add(file);
    checkFileLines(file, file.endsWith(".md"));
    if (file.endsWith(".md")) {
      const content = fs.readFileSync(file, "utf8");
      for (const asset of extractIncludedHandbookFiles(content, file, root)) {
        if (checkedAssets.has(asset)) continue;
        checkedAssets.add(asset);
        if (/\.(?:md|markdown|svg|html|htm|txt|csv|tsv|json|ya?ml)$/iu.test(asset)) {
          checkFileLines(asset, false);
        }
      }
    }
  }

  const builtPreviewDir = path.join(root, "public/media/garden-docs/en");
  for (const file of walkFiles(builtPreviewDir)) {
    if (checkedAssets.has(file)) continue;
    checkedAssets.add(file);
    if (/\.(?:md|markdown|svg|html|htm|txt|csv|tsv|json|ya?ml)$/iu.test(file)) {
      checkFileLines(file, false);
    }
  }

  return issues;
}

/**
 * Inspect a single built HTML document for an English handbook route (or the
 * English 404 output), covering <head> meta tags, <title>, visible text, and
 * user-facing attributes (`content`, `alt`, `title`, `aria-label`, `placeholder`).
 * Only the `中` language switcher, the `丨` / `｜` title-split delimiter explanation,
 * and the narrow `"全部"` config value on `/garden/en/components/figure` (`parts[].id` row)
 * are permitted.
 * Note: This check inspects static HTML markup only and does not cover runtime rendering
 * or client-side hydration in a real browser.
 */
export function findBuiltEnglishHtmlCjk(html, pageLabel = "/garden/en") {
  const issues = [];
  const cleaned = stripAllowedFigureAllKeywordInHtml(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/giu, "")
      .replace(/<style[\s\S]*?<\/style>/giu, ""),
    pageLabel,
  );

  const recordIfCjk = (value, context, allowTitleSplit = false) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    if (text === ALLOWED_EN_HANDBOOK_CJK.switcher) return;
    const bad = findDisallowedEnCjk(text, { allowTitleSplit });
    if (bad.length > 0) {
      const sample = [...new Set(bad)].slice(0, 8).join("");
      issues.push({
        file: pageLabel,
        line: 1,
        kind: "en-built-cjk",
        message: `Built English HTML (${context}) contains CJK character(s) "${sample}": ${text.slice(0, 100)}`,
      });
    }
  };

  // 1. Check <head> <title> and <meta> tags
  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head>/iu.exec(cleaned);
  const headHtml = headMatch ? headMatch[1] : "";
  for (const m of headHtml.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/giu)) {
    recordIfCjk(m[1], "<title>", false);
  }
  for (const m of headHtml.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = m[0];
    const nameOrProp =
      /\b(?:name|property)=["']([^"']*)["']/iu.exec(tag)?.[1] ?? "<meta>";
    const content = /\bcontent=["']([^"']*)["']/iu.exec(tag)?.[1] ?? "";
    recordIfCjk(content, `meta[${nameOrProp}]`, false);
  }

  // 2. Check user-facing attributes across the entire document
  for (const m of cleaned.matchAll(/\s(aria-label|title|placeholder|alt)=["']([^"']*)["']/giu)) {
    recordIfCjk(m[2], `attr[${m[1]}]`, false);
  }

  // 3. Check all text nodes across the entire document
  for (const m of cleaned.matchAll(/>([^<]+)</gu)) {
    const text = m[1].trim();
    if (!text) continue;
    recordIfCjk(text, "text", true);
  }

  return issues;
}

/**
 * Check any static-export HTML files already present under dist/client/garden/en/.
 * Note: Static CJK checks do not cover runtime rendering or hydration of routes such as
 * the shared root 404.html; runtime rendering is verified separately in a real browser.
 */
export function checkBuiltEnglishHandbookHtmlFiles(root = ROOT) {
  const clientDir = path.join(root, "dist/client");
  const clientEnDir = path.join(clientDir, "garden/en");
  const issues = [];
  if (fs.existsSync(clientEnDir)) {
    for (const file of walkFiles(clientEnDir, (f) => f.endsWith(".html"))) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      const html = fs.readFileSync(file, "utf8");
      issues.push(...findBuiltEnglishHtmlCjk(html, rel));
    }
  }
  return issues;
}

const HANDBOOK_EMBEDDED_TEMPLATES = [
  {
    handbookFile: "docs/handbook/config.md",
    templateFile: "templates/site/site.config.yaml",
    label: "site.config.yaml",
  },
  {
    handbookFile: "docs/handbook/en/config.md",
    templateFile: "templates/site/site.config.en.yaml",
    label: "site.config.en.yaml",
  },
  {
    handbookFile: "docs/handbook/deploy.md",
    templateFile: "templates/workflows/pages.yml",
    label: "pages.yml",
  },
  {
    handbookFile: "docs/handbook/en/deploy.md",
    templateFile: "templates/workflows/pages.en.yml",
    label: "pages.en.yml",
  },
];

/**
 * Verify that the Chinese and English handbook config/deploy pages embed their
 * corresponding site.config.yaml and pages.yml templates verbatim.
 */
export function checkHandbookTemplates(root = ROOT) {
  const issues = [];
  for (const { handbookFile, templateFile, label } of HANDBOOK_EMBEDDED_TEMPLATES) {
    const fullHandbook = path.join(root, handbookFile);
    const fullTemplate = path.join(root, templateFile);
    if (!fs.existsSync(fullHandbook) || !fs.existsSync(fullTemplate)) continue;
    const expected = fs.readFileSync(fullTemplate, "utf8").replace(/\r\n/gu, "\n").trimEnd();
    const { fences } = parseMarkdownRegions(fs.readFileSync(fullHandbook, "utf8"));
    const yamlFence = fences.find((f) => f.lang === "yaml" || f.lang === "yml");
    if (!yamlFence) {
      issues.push({
        file: handbookFile,
        line: 1,
        kind: "template-drift",
        message: `Missing YAML fence for template ${templateFile} (${label})`,
      });
      continue;
    }
    const actual = yamlFence.bodyLines.map((l) => l.text).join("\n").replace(/\r\n/gu, "\n").trimEnd();
    if (actual !== expected) {
      const actualLines = actual.split("\n");
      const expectedLines = expected.split("\n");
      let diffIdx = 0;
      while (
        diffIdx < actualLines.length &&
        diffIdx < expectedLines.length &&
        actualLines[diffIdx] === expectedLines[diffIdx]
      ) {
        diffIdx += 1;
      }
      const line = yamlFence.bodyLines[diffIdx]?.lineNumber ?? yamlFence.startLine;
      issues.push({
        file: handbookFile,
        line,
        kind: "template-drift",
        message: `Embedded ${label} fence does not match ${templateFile} verbatim (first difference at template line ${diffIdx + 1})`,
      });
    }
  }
  return issues;
}

/**
 * Scan all docs/handbook/ and app/garden/ files and return any fact-check failures.
 */
export function checkAllHandbookFacts(root = ROOT) {
  const facts = deriveHandbookFacts(root);
  const files = [
    ...walkFiles(path.join(root, "docs/handbook"), (f) => f.endsWith(".md")),
    ...walkFiles(path.join(root, "app/garden"), (f) => /\.(?:ts|tsx|js|mjs|md)$/u.test(f)),
  ];
  const issues = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    issues.push(...checkFileFacts(file, content, facts, root));
  }
  issues.push(...checkHandbookPairs(root));
  issues.push(...checkHandbookTemplates(root));
  issues.push(...checkEnglishHandbookNoCjk(root));
  issues.push(...checkBuiltEnglishHandbookHtmlFiles(root));
  const svgFiles = walkFiles(path.join(root, "docs/handbook"), (f) => f.endsWith(".svg"));
  for (const svgFile of svgFiles) {
    const svgContent = fs.readFileSync(svgFile, "utf8");
    const relSvg = path.relative(root, svgFile).replace(/\\/g, "/");
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]/u.test(svgContent)) {
      issues.push({
        file: relSvg,
        line: 1,
        kind: "svg-encoding",
        message: "SVG file contains control characters or invalid UTF-8 replacement characters",
      });
    }
  }
  return { facts, issues };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const { facts, issues } = checkAllHandbookFacts(ROOT);
  console.log(
    `Derived facts: ${facts.cli.gardenCommands.size} garden commands, ${facts.cli.uiSubcommands.size} ui subcommands, ${facts.cli.allFlags.size} flags, ${facts.makefile.targets.size} make targets, ${facts.envVars.size} env vars, ${facts.siteConfig.keyPaths.size} site.config paths, ${facts.checkCodes.size} check codes, ${facts.cssTokens.size} CSS tokens.`,
  );
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`${issue.file}:${issue.line} [${issue.kind}] ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Handbook fact-check passed: 0 issues (static source/HTML check; does not cover runtime rendering).");
  }
}
