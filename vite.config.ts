import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";
import { gardenPackageRoot, gardenSiteRoot } from "./scripts/garden-paths.mjs";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;
const siteRoot = gardenSiteRoot();
const generatedContent = path.join(siteRoot, ".garden", "generated-content.ts");
const generatedSiteConfig = path.join(siteRoot, ".garden", "site-config.ts");
const generatedAliases = {
  "@garden/generated-content": generatedContent,
  "@garden/site-config": generatedSiteConfig,
};

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

function gardenContent() {
  const sync = (mode?: "preview", { refreshLinks = false, files = [] as string[] } = {}) => {
    if (refreshLinks && process.env.GARDEN_OFFLINE !== "1") {
      // Same entry as `garden links` / formal build. link-assets keeps usable cache on failure.
      const links = spawnSync(process.execPath, [path.join(gardenPackageRoot, "scripts", "link-assets.mjs"), "--dev"], {
        cwd: siteRoot,
        env: { ...process.env, GARDEN_SITE: siteRoot, GARDEN_LINK_FILES: JSON.stringify(files) },
        stdio: "inherit",
      });
      if (links.status !== 0) console.warn("链接资源：刷新失败，沿用可用缓存");
    }
    return spawnSync(process.execPath, [path.join(gardenPackageRoot, "scripts", "build-content.mjs")], {
      cwd: siteRoot,
      env: { ...process.env, GARDEN_SITE: siteRoot, ...(mode ? { GARDEN_CONTENT_MODE: mode } : {}) },
      stdio: "inherit",
    });
  };

  return {
    name: "garden-content",
    enforce: "post" as const,
    config() {
      return {
        resolve: {
          alias: generatedAliases,
        },
      };
    },
    resolveId(id: string) {
      const normalized = id.split("?")[0];
      if (normalized === "@garden/generated-content") return generatedContent;
      if (normalized === "@garden/site-config") return generatedSiteConfig;
      return undefined;
    },
    buildStart() {
      if (!fs.existsSync(generatedContent) || !fs.existsSync(generatedSiteConfig)) {
        sync();
      }
    },
    configureServer(server) {
      const contentDir = path.join(siteRoot, "content");
      const configFile = path.join(siteRoot, "site.config.yaml");
      server.watcher.add([contentDir, configFile]);
      let pending: ReturnType<typeof setTimeout> | undefined;
      const changedFiles = new Set<string>();
      const onContentEvent = (file: string) => {
        const relative = path.relative(contentDir, file);
        if (file !== configFile && (relative.startsWith("..") || path.isAbsolute(relative))) return;
        changedFiles.add(file);
        clearTimeout(pending);
        // Coalesce editor atomic writes/renames; regenerate before asking browsers
        // to reload, including newly created and deleted Markdown routes.
        pending = setTimeout(() => {
          const files = [...changedFiles];
          changedFiles.clear();
          const result = sync("preview", { refreshLinks: true, files });
          if (result.status === 0) {
            // The generator is synchronous; filesystem notifications have not
            // necessarily reached Vite yet. Invalidate generated imports before
            // any browser can request the new document.
            for (const environment of Object.values(server.environments)) {
              for (const generated of [generatedContent, generatedSiteConfig]) {
                const modules = environment.moduleGraph.getModulesByFile(generated);
                for (const generatedModule of modules ?? []) environment.moduleGraph.invalidateModule(generatedModule);
              }
            }
            server.ws.send({ type: "full-reload" });
          }
        }, 800);
      };
      server.watcher.on("add", onContentEvent);
      server.watcher.on("change", onContentEvent);
      server.watcher.on("unlink", onContentEvent);
      server.httpServer?.once("close", () => {
        clearTimeout(pending);
        server.watcher.off("add", onContentEvent);
        server.watcher.off("change", onContentEvent);
        server.watcher.off("unlink", onContentEvent);
      });
    },
  };
}

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= path.join(siteRoot, ".wrangler", "wrangler.log");
  process.env.MINIFLARE_REGISTRY_PATH ??= path.join(siteRoot, ".wrangler", "registry");

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    envDir: siteRoot,
    resolve: {
      alias: generatedAliases,
      modules: [
        path.join(siteRoot, "node_modules"),
        path.join(gardenPackageRoot, "node_modules"),
        "node_modules",
      ],
    },
    build: {
      // Mermaid remains a route-level dynamic import. Its intentionally lazy
      // diagram engine is larger than the default warning threshold, but it is
      // never part of the site's initial navigation bundle.
      chunkSizeWarningLimit: 700,
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      gardenContent(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
