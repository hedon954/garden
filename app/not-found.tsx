"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routeLang, ui } from "./lib/i18n";

const INLINE_EN_404_SCRIPT = `(function(){try{var p=typeof location!=="undefined"?location.pathname:"";if(!/(^|\\/)garden\\/en(\\/|$)/.test(p))return;document.documentElement.lang="en";var s=document.title.split(" \\u00b7 ").pop()||"Garden";var t="Page not found \\u00b7 "+s;var m="The address may be wrong, or the page has moved.";document.title=t;var q=function(k,v,c){var e=document.querySelector('meta['+k+'="'+v+'"]');if(e)e.setAttribute("content",c);};q("name","description",m);q("property","og:title",t);q("property","og:description",m);q("property","og:locale","en_US");q("property","og:image:alt",t);q("name","twitter:title",t);q("name","twitter:description",m);var r=document.getElementById("garden-not-found");if(r){var h=r.querySelector("h1");if(h)h.textContent="Page not found";var d=r.querySelector(".sh-deck");if(d)d.textContent=m;var a=r.querySelector("a[data-not-found-home]");if(a)a.textContent="Back to home";}}catch(e){}})();`;

export default function NotFound() {
  const pathname = usePathname();
  const t = ui(routeLang(pathname));
  return (
    <main className="page-shell" id="garden-not-found">
      <header className="sh-head">
        <h1>{t.notFoundTitle}</h1>
        <p className="sh-deck">{t.notFoundDeck}</p>
      </header>
      <p>
        <Link href="/" data-not-found-home="">
          {t.backHome}
        </Link>
      </p>
      <script dangerouslySetInnerHTML={{ __html: INLINE_EN_404_SCRIPT }} />
    </main>
  );
}
