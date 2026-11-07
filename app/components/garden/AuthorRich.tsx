"use client";
import {renderArticleContent} from "../../../ui/garden/article-content.mjs";
export function AuthorRich({text}:{text:string}) {
  return <span dangerouslySetInnerHTML={{__html:renderArticleContent(String(text??""),{inline:true})}}/>;
}
