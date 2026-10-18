// Static export: request the home page's RSC payload where the export writes it.
//
// vinext's client builds every RSC address as `<pathname>.rsc` (trailing slash
// dropped), so the home page becomes `/.rsc`. The static export writes that
// payload to `index.rsc` (vinext's getRscOutputPath maps "/" there). A static
// host has no server to bridge the two, so every <Link href="/"> prefetch, and
// any client navigation home, hit a 404. With output: "export" this plugin
// changes the address builder (toRscRequestPath) so "/" asks for `/index.rsc`.
// Every other path already matches the exported file. Prefetching stays on.

const TARGET = /[\\/]vinext[\\/]dist[\\/]server[\\/]app-rsc-cache-busting\.js$/u;
const ADDRESS = "return `${pathname.length > 1 && pathname.endsWith(\"/\") ? pathname.slice(0, -1) : pathname}.rsc${query}`;";
const EXPORTED = "return `${pathname === \"/\" ? \"/index\" : pathname.length > 1 && pathname.endsWith(\"/\") ? pathname.slice(0, -1) : pathname}.rsc${query}`;";

/** Rewrite vinext's RSC address builder; throws if vinext changed shape. */
export function exportRscAddress(code, id = "app-rsc-cache-busting.js") {
  if (!code.includes("function toRscRequestPath(") || !code.includes(ADDRESS)) {
    throw new Error(`garden static RSC path: could not find vinext's RSC address builder in ${id}. vinext changed; update build/static-rsc-path-plugin.mjs so the home page asks for /index.rsc.`);
  }
  return code.replace(ADDRESS, EXPORTED);
}

export default function staticRscPath({ enabled = process.env.STATIC_EXPORT === "1" } = {}) {
  let seen = false;
  return {
    name: "garden-static-rsc-path",
    apply: "build",
    transform(code, id) {
      // Browser bundle only: the prerender server still answers "/.rsc" itself.
      if (!enabled || this.environment?.name !== "client" || !TARGET.test(id.split("?")[0])) return null;
      seen = true;
      return { code: exportRscAddress(code, id), map: null };
    },
    buildEnd(error) {
      // The client build always pulls the address builder in; not seeing it means vinext moved it.
      if (enabled && !error && this.environment?.name === "client" && !seen) {
        this.error("garden static RSC path: vinext's app-rsc-cache-busting.js was not part of the client build; update build/static-rsc-path-plugin.mjs.");
      }
    },
  };
}
