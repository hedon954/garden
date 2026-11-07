"use client";
import { createContext, useContext, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { markdownPlugins } from '../../lib/markdown-plugins';
import { renderArticleContent } from '../../../ui/garden/article-content.mjs';
const ComposeContent = createContext(false);
export function ComposeContentProvider({children}:{children:ReactNode}) {
  return <ComposeContent.Provider value={true}>{children}</ComposeContent.Provider>;
}
export const useComposeContent = () => useContext(ComposeContent);
export function AuthorRich({text}:{text:string}) {
  const compose=useContext(ComposeContent);
  if(compose) return <span dangerouslySetInnerHTML={{__html:renderArticleContent(String(text??''),{inline:true})}}/>;
  return <ReactMarkdown remarkPlugins={markdownPlugins} components={{p:({children})=><>{children}</>}}>{String(text??'')}</ReactMarkdown>;
}
