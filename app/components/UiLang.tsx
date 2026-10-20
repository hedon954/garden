"use client";

import { createContext, useContext, type ReactNode } from "react";
import { siteLang, ui, type UiLang } from "../lib/i18n";

/**
 * The language of the framework chrome inside a page body (copy buttons, code
 * tabs, file cards...). It is the site language everywhere except the /garden/
 * handbook, whose pages set it from their own route (/garden/en/ is English).
 */
const UiLangContext = createContext<UiLang>(siteLang);

export function UiLangProvider({ lang, children }: { lang?: UiLang; children: ReactNode }) {
  return <UiLangContext.Provider value={lang ?? siteLang}>{children}</UiLangContext.Provider>;
}

export const useUiLang = () => useContext(UiLangContext);
export const useUi = () => ui(useContext(UiLangContext));
