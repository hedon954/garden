/**
 * In-page `#` links without a page refetch.
 *
 * Following a plain `<a href="#section">` is a fragment navigation: the
 * browser scrolls, adds a history entry with no state and fires `popstate`.
 * The router (vinext 0.0.50) treats every `popstate` as a history traversal
 * and fetches the page's RSC payload again, although only the hash changed.
 * Next.js itself ignores a popstate without state.
 *
 * The guard notes a click on a same-page hash link that nothing else handled,
 * and swallows the stateless `popstate` that follows it before the router
 * sees it. On `window`, listeners run in the order they were added, capture
 * or not, so this has to be added before the router's: it ships as a small
 * inline script in <head>, which runs before the deferred module scripts.
 * The click listener sits on `window`, after React's handlers on the
 * document, so a link that the TOC or a Link already handled is left alone.
 * Back and forward between real history entries still reach the router.
 */

/** How long after the click the fragment's popstate may arrive. */
export const HASH_JUMP_WINDOW_MS = 1000;

export const HASH_JUMP_SCRIPT = `(function(w){var armed=-Infinity;\
w.addEventListener("click",function(e){\
if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;\
var a=e.target&&e.target.closest&&e.target.closest("a[href]");\
if(!a||a.hasAttribute("download"))return;\
var t=a.getAttribute("target");if(t&&t!=="_self")return;\
var h=a.getAttribute("href")||"";if(h.indexOf("#")<0)return;\
var u,l=w.location;try{u=new URL(h,l.href)}catch(x){return}\
if(u.origin===l.origin&&u.pathname===l.pathname&&u.search===l.search&&u.hash.length>1)armed=Date.now();\
});\
w.addEventListener("popstate",function(e){\
var on=Date.now()-armed<=${HASH_JUMP_WINDOW_MS};armed=-Infinity;\
if(on&&e.state==null)e.stopImmediatePropagation();\
},true);\
})(window);`;
