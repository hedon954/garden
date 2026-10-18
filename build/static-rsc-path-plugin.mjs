// Static export: request the home page's RSC payload where the export writes it.
//
// vinext's client builds every RSC address as `<pathname>.rsc` (trailing slash
// dropped), so the home page becomes `/.rsc`. The static export writes that
// payload to `index.rsc` (vinext's getRscOutputPath maps "/" there). A static
// host has no server to bridge the two, so every <Link href="/"> prefetch, and
// any client navigation home, hit a 404. With output: "export" this plugin
// changes the address builder (toRscRequestPath) so "/" asks for `/index.rsc`.
// Every other path already matches the exported file. Prefetching stays on.
//
// Static hosts do not know the .rsc extension either: GitHub Pages serves it as
// application/octet-stream, and vinext only accepts text/x-component, so every
// client navigation fell back to a full page load, aimed at the payload URL
// minus ".rsc" (for home that is "/index"). In the browser navigation code the
// export also accepts application/octet-stream, and a fallback to "/index"
// goes to "/".
//
// Rewrites vinext 0.0.50. Remove this plugin once vinext fixes it upstream
// (draft issue: /workspace/dev/vinext-issue.md); a vinext whose code no longer
// matches stops the build.

const TARGET = /[\\/]vinext[\\/]dist[\\/]server[\\/]app-rsc-cache-busting\.js$/u;
const NAVIGATION = /[\\/]vinext[\\/]dist[\\/]server[\\/]app-browser-entry\.js$/u;
const RSC_CHECK = 'const isRscResponse = (navResponse.headers.get("content-type") ?? "").startsWith("text/x-component");';
const RSC_CHECK_EXPORTED = 'const isRscResponse = /^(text\\/x-component|application\\/octet-stream)/.test(navResponse.headers.get("content-type") ?? "");';
const FALLBACK = "let pathname = stripRscSuffix(parsed.pathname);";
const FALLBACK_EXPORTED = 'let pathname = stripRscSuffix(parsed.pathname); if (pathname === "/index") pathname = "/";';
const ADDRESS = "return `${pathname.length > 1 && pathname.endsWith(\"/\") ? pathname.slice(0, -1) : pathname}.rsc${query}`;";
const EXPORTED = "return `${pathname === \"/\" ? \"/index\" : pathname.length > 1 && pathname.endsWith(\"/\") ? pathname.slice(0, -1) : pathname}.rsc${query}`;";

/** Rewrite vinext's RSC address builder; throws if vinext changed shape. */
export function exportRscAddress(code, id = "app-rsc-cache-busting.js") {
  if (!code.includes("function toRscRequestPath(") || !code.includes(ADDRESS)) {
    throw new Error(`garden static RSC path: could not find vinext's RSC address builder in ${id}. vinext changed; update build/static-rsc-path-plugin.mjs so the home page asks for /index.rsc.`);
  }
  return code.replace(ADDRESS, EXPORTED);
}

/** Rewrite vinext's client navigation for static hosts; throws if vinext changed shape. */
export function exportNavigation(code, id = "app-browser-entry.js") {
  for (const needle of [RSC_CHECK, FALLBACK]) {
    if (code.split(needle).length !== 2) {
      throw new Error(`garden static RSC path: could not find \`${needle}\` exactly once in ${id}. vinext changed; update build/static-rsc-path-plugin.mjs (or remove it if vinext fixed static hosting).`);
    }
  }
  return code.replace(RSC_CHECK, RSC_CHECK_EXPORTED).replace(FALLBACK, FALLBACK_EXPORTED);
}

export default function staticRscPath({ enabled = process.env.STATIC_EXPORT === "1" } = {}) {
  const seen = new Set();
  return {
    name: "garden-static-rsc-path",
    apply: "build",
    transform(code, id) {
      // Browser bundle only: the prerender server still answers "/.rsc" itself.
      if (!enabled || this.environment?.name !== "client") return null;
      const file = id.split("?")[0];
      if (TARGET.test(file)) {
        seen.add("address");
        return { code: exportRscAddress(code, id), map: null };
      }
      if (NAVIGATION.test(file)) {
        seen.add("navigation");
        return { code: exportNavigation(code, id), map: null };
      }
      return null;
    },
    buildEnd(error) {
      // The client build always pulls the address builder in; not seeing it means vinext moved it.
      if (enabled && !error && this.environment?.name === "client" && seen.size < 2) {
        this.error("garden static RSC path: vinext's app-rsc-cache-busting.js or app-browser-entry.js was not part of the client build; update build/static-rsc-path-plugin.mjs.");
      }
    },
  };
}
