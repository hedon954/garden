import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { syncEditorVersion } from "./sync-editor-version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "editors", "dist");
const lockDir = path.join(root, "editors", ".pack-lock");

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function distReady() {
  const vsixDir = path.join(distDir, "vscode");
  const manifest = path.join(distDir, "typora", "manifest.json");
  if (!fs.existsSync(manifest) || !fs.existsSync(vsixDir)) return false;
  const version = syncEditorVersion({ check: true });
  return fs.existsSync(path.join(vsixDir, `garden-ui-${version}.vsix`));
}

function withPackLock(fn) {
  const started = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() - started > 180_000) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      sleepSync(200);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

function runBuild(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dosDate(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/** Store-method ZIP. VSIX is a ZIP with a manifest at the archive root. */
function zipStore(entries) {
  const { time, day } = dosDate(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

function addTree(entries, directory, prefix) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) addTree(entries, absolute, name);
    else if (entry.isFile()) entries.push({ name, data: fs.readFileSync(absolute) });
  }
}

function contentTypes(entries) {
  const defaults = new Map([
    [".json", "application/json"],
    [".js", "application/javascript"],
    [".css", "text/css"],
    [".md", "text/markdown"],
    [".txt", "text/plain"],
    [".vsixmanifest", "text/xml"],
    [".xml", "text/xml"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
  ]);
  const lines = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
  ];
  const used = new Set(entries.map((entry) => path.posix.extname(entry.name).toLowerCase()));
  used.add(".vsixmanifest");
  used.add(".xml");
  for (const [extension, type] of defaults) {
    if (used.has(extension)) {
      lines.push(`  <Default Extension="${extension.slice(1)}" ContentType="${type}"/>`);
    }
  }
  if (entries.some((entry) => entry.name === "extension/LICENSE")) {
    lines.push(`  <Override PartName="/extension/LICENSE" ContentType="text/plain"/>`);
  }
  lines.push(`</Types>`, ``);
  return lines.join("\n");
}

function vsixManifest(manifest) {
  const tags = (manifest.keywords ?? []).join(",");
  const categories = (manifest.categories ?? []).join(",");
  return `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${xmlEscape(manifest.name)}" Version="${xmlEscape(manifest.version)}" Publisher="${xmlEscape(manifest.publisher)}"/>
    <DisplayName>${xmlEscape(manifest.displayName)}</DisplayName>
    <Description xml:space="preserve">${xmlEscape(manifest.description)}</Description>
    <Tags>${xmlEscape(tags)}</Tags>
    <Categories>${xmlEscape(categories)}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${xmlEscape(manifest.engines.vscode)}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
`;
}

function packageVsix() {
  const source = path.join(root, "editors", "vscode");
  const manifest = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8"));
  syncEditorVersion({ check: true });
  const entries = [];
  const license = path.join(root, "LICENSE");
  if (fs.existsSync(license)) entries.push({ name: "extension/LICENSE", data: fs.readFileSync(license) });
  entries.push({ name: "extension/package.json", data: fs.readFileSync(path.join(source, "package.json")) });
  entries.push({ name: "extension/README.md", data: fs.readFileSync(path.join(source, "README.md")) });
  addTree(entries, path.join(source, "dist"), "extension/dist");
  addTree(entries, path.join(source, "snippets"), "extension/snippets");
  addTree(entries, path.join(source, "syntaxes"), "extension/syntaxes");
  entries.unshift(
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes(entries)) },
    { name: "extension.vsixmanifest", data: Buffer.from(vsixManifest(manifest)) },
  );
  const destination = path.join(distDir, "vscode");
  fs.mkdirSync(destination, { recursive: true });
  const filename = `${manifest.name}-${manifest.version}.vsix`;
  fs.writeFileSync(path.join(destination, filename), zipStore(entries));
  return filename;
}

function packageTypora() {
  const from = path.join(root, "editors", "typora", "dist");
  const to = path.join(distDir, "typora");
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

function buildArtifacts() {
  runBuild(path.join(root, "editors", "vscode", "build.mjs"));
  runBuild(path.join(root, "editors", "typora", "build.mjs"));
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  const vsix = packageVsix();
  packageTypora();
  process.stdout.write(`编辑器插件已打包：editors/dist/vscode/${vsix}、editors/dist/typora/\n`);
}

/**
 * Builds the VS Code VSIX and Typora plugin into `editors/dist/` when they are missing.
 * `npm pack` calls this with `force` so the published tarball is freshly built.
 */
export function packEditors({ force = false } = {}) {
  if (!force && distReady()) return distDir;
  return withPackLock(() => {
    if (!force && distReady()) return distDir;
    buildArtifacts();
    return distDir;
  });
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) packEditors({ force: true });
