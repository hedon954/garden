import test from 'node:test';
import assert from 'node:assert/strict';
import {composeSchema} from '../ui/compose/contracts.mjs';
import {AUTHOR_PLAY_TAGS} from '../ui/compose/dil.mjs';
import {FEATURE_FIELDS} from '../ui/compose/features.mjs';
import {COMPONENTS} from '../ui/core/catalog.mjs';
import {ARTICLE_TAGS,ARTICLE_CSS_PROPERTIES} from '../ui/garden/article-content.mjs';
test('demand-loaded author schema derives semantic, Play and safe-content contracts from actual validators',()=>{
 const s=composeSchema();assert.equal(s.entry,'garden compose');
 for(const [tag,target]of Object.entries(AUTHOR_PLAY_TAGS))assert.deepEqual(s.play[tag].properties,COMPONENTS[target].props??{});
 for(const [tag,fields]of Object.entries(FEATURE_FIELDS))assert.deepEqual(s.semantic[tag].properties,fields.filter(p=>p!=='resolved'));
 assert.deepEqual(s.content.htmlTags,[...ARTICLE_TAGS]);assert.deepEqual(s.content.cssProperties,[...ARTICLE_CSS_PROPERTIES]);
 assert.ok(s.content.htmlTags.includes('u'));assert.ok(!s.content.htmlTags.includes('script'));
 assert.ok(Object.values(s.play).every(p=>!Array.isArray(p.children)||p.children.every(t=>!/[A-Z]/u.test(t))));
 assert.match(s.typography.body,/actual article/);assert.equal(s.typography.textSize.sm,.875);
});
