import { FEATURE_TAGS } from './features.mjs';

// Semantic islands own their descendants. Match quoted attributes before `>`;
// these components cannot recursively contain another instance of themselves.
const names = [...FEATURE_TAGS, 'compare'].join('|');
const opening = String.raw`(?:"[^"]*"|'[^']*'|[^'">])*?`;
const scenePattern = new RegExp(`<(${names})\\b${opening}(?:\\/>|>[\\s\\S]*?<\\/\\1\\s*>)`, 'giu');
export function mapNativeScenes(source, visit) {
  return String(source).replace(scenePattern, whole => visit(whole));
}
