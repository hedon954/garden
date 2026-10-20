import Link from "next/link";
import { ui } from "./lib/i18n";

export default function NotFound() {
  const t = ui();
  return (
    <main className="page-shell">
      <header className="sh-head">
        <h1>{t.notFoundTitle}</h1>
        <p className="sh-deck">{t.notFoundDeck}</p>
      </header>
      <p><Link href="/">{t.backHome}</Link></p>
    </main>
  );
}
