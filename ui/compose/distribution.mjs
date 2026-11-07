import {composeText} from './render.mjs';
import {fileFeedMarkdown} from '../garden/file-block.mjs';
/** Readable layout fallback, preserving actionable file links instead of payload JSON. */
export function composeMarkdown(doc,options={}) {
 const walk=nodes=>nodes.map(node=>node.type==='feature'&&node.name==='file'?fileFeedMarkdown(node.props,options):node.children?.length?walk(node.children):composeText({...doc,nodes:[node]})).join('\n\n');
 return walk(doc.nodes);
}
