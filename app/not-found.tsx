import Link from "next/link";
import { siteLinks } from "@garden/site-config";
import { UI_STRINGS } from "./lib/i18n";

const basePath = (siteLinks?.basePath ?? "").replace(/\/+$/u, "");

export const INLINE_404_SCRIPT = `(function(){try{var p=typeof location!=="undefined"?location.pathname:"";var b=${JSON.stringify(basePath)};if(b&&p.indexOf(b)===0){var a=p.slice(b.length);if(!a||a.charAt(0)==="/")p=a||"/";}var en=/^\\/garden\\/en(\\/|$)/.test(p);var r=document.getElementById("garden-not-found");if(en){document.documentElement.lang="en";var s=document.title.split(" \\u00b7 ").pop()||"Garden";var t="Page not found \\u00b7 "+s;var m="The address may be wrong, or the page has moved.";document.title=t;var q=function(k,v,c){var e=document.querySelector('meta['+k+'="'+v+'"]');if(e)e.setAttribute("content",c);};q("name","description",m);q("property","og:title",t);q("property","og:description",m);q("property","og:locale","en_US");q("property","og:image:alt",t);q("name","twitter:title",t);q("name","twitter:description",m);if(r){var h=r.querySelector("h1");if(h)h.textContent="Page not found";var d=r.querySelector("[data-not-found-deck]");if(d){d.textContent=m;d.removeAttribute("lang");}var l=r.querySelector("a[data-not-found-home]");if(l)l.textContent="Back to home";}var sk=document.querySelector(".skip-link");if(sk)sk.textContent="Skip to content";var nv={"\\u6587\\u7ae0":"Posts","\\u968f\\u60f3":"Thoughts","\\u4e13\\u680f":"Columns","\\u6807\\u7b7e":"Tags","\\u5173\\u4e8e":"About","\\u641c\\u7d22":"Search","\\u6df1\\u8272\\u6a21\\u5f0f":"Dark mode"};document.querySelectorAll("#site-header a, #site-header .lbl, #site-header .sh-menu-theme span").forEach(function(el){var k=el.textContent&&el.textContent.trim();if(k&&nv[k])el.textContent=nv[k];});var al={"\\u7ad9\\u70b9\\u5bfc\\u822a":"Site navigation","\\u7ad9\\u70b9\\u5bfc\\u822a\\uff08\\u79fb\\u52a8\\u7aef\\uff09":"Site navigation (mobile)","\\u641c\\u7d22\\u6587\\u7ae0":"Search posts","\\u5207\\u6362\\u5230\\u6df1\\u8272\\u6a21\\u5f0f":"Switch to dark mode","\\u5207\\u6362\\u5230\\u6d45\\u8272\\u6a21\\u5f0f":"Switch to light mode","\\u6253\\u5f00\\u83dc\\u5355":"Open menu","\\u5173\\u95ed\\u83dc\\u5355":"Close menu"};document.querySelectorAll("#site-header [aria-label]").forEach(function(el){var v=el.getAttribute("aria-label");if(v&&al[v])el.setAttribute("aria-label",al[v]);});var fp=document.querySelector(".sh-footer .sh-foot > p");if(fp)fp.innerHTML='<span class="footer-framework">Built with <a href="https://github.com/hedon954/garden" target="_blank" rel="noreferrer">Garden</a></span>';}else if(r){var h2=r.querySelector("h1");if(h2)h2.textContent="\\u627e\\u4e0d\\u5230\\u8fd9\\u4e00\\u9875";var d2=r.querySelector("[data-not-found-deck]");if(d2){d2.textContent="\\u5730\\u5740\\u53ef\\u80fd\\u5199\\u9519\\u4e86\\uff0c\\u6216\\u8005\\u8fd9\\u7bc7\\u5df2\\u7ecf\\u4e0d\\u5728\\u4e86\\u3002";d2.removeAttribute("lang");}var l2=r.querySelector("a[data-not-found-home]");if(l2)l2.textContent="\\u8fd4\\u56de\\u9996\\u9875";}}catch(e){}})();`;

export default function NotFound() {
  // Without JS, show one line of Chinese and one line of English; never show
  // both full copy sets at once. The inline script below picks the language
  // from location.pathname (after stripping configured basePath) and shows
  // the full English or Chinese copy.
  return (
    <main className="page-shell" id="garden-not-found" suppressHydrationWarning>
      <header className="sh-head">
        <h1 suppressHydrationWarning>{UI_STRINGS.zh.notFoundTitle}</h1>
        <p
          className="sh-deck"
          data-not-found-deck=""
          lang="en"
          suppressHydrationWarning
        >
          {UI_STRINGS.en.notFoundDeck}
        </p>
      </header>
      <p>
        <Link href="/" data-not-found-home="" suppressHydrationWarning>
          ← /
        </Link>
      </p>
      <script data-not-found-script="" dangerouslySetInnerHTML={{ __html: INLINE_404_SCRIPT }} />
    </main>
  );
}
