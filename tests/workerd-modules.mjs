// Lets Node import the worker build (dist/server/index.js). Since vinext 1.0 the
// bundle imports `cloudflare:workers` for Workers tracing; only workerd has that
// module. In Node it resolves to an empty one, so no tracing is registered.
import { register } from "node:module";

const hooks = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("cloudflare:")) return { url: "data:text/javascript,export default {};", shortCircuit: true };
  return nextResolve(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);
