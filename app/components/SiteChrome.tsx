"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter />
    </>
  );
}
