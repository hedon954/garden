import {parseCompose} from './markup.mjs';
import {looksLikePlayCompose} from './dil.mjs';
import {mapNativeScenes} from './scenes.mjs';
/** Normalized static/native nodes. Dynamic component IR is validated separately. */
export function inspectComposeBody(body){
 const docs=[];
 if(looksLikePlayCompose(body))mapNativeScenes(String(body).replace(/<(markdown|html)>[\s\S]*?<\/\1>/giu,''),source=>{const p=parseCompose(source);if(p.ok)docs.push(p.doc);return source;});
 else {const p=parseCompose(body);if(p.ok)docs.push(p.doc);}
 const nodes=[];const walk=items=>items?.forEach(node=>{nodes.push(node);walk(node.children)});docs.forEach(doc=>walk(doc.nodes));
 return nodes;
}
