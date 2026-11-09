import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { managedSkillBundle } from '../scripts/managed-skills.mjs';
const root = path.resolve(import.meta.dirname, '..');
const skill = path.join(root, '.agents/skills/garden-compose');

test('both author entries expose the same metric/card and title/badge decisions', () => {
  for (const lang of ['zh', 'en']) {
    const entry = managedSkillBundle({ engineRoot: root, name: 'garden-compose', lang })['SKILL.md'].toString();
    for (const token of ['metric', 'equal-cards', 'justify="between"', 'wrap="nowrap"']) assert.ok(entry.includes(token), lang + ': ' + token);
  }
});

test('equal-card examples preserve grouping borders without implicit surface fill', () => {
  const section = fs.readFileSync(path.join(skill, 'references/layout-recipes.md'), 'utf8').split('## 图标窄栏')[0];
  const example = section.match(/```garden compose\n([\s\S]*?)\n```/)[1];
  const cards = [...example.matchAll(/<card[^>]*>/g)].map(match => match[0]);
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.match(card, /border="subtle"/);
    assert.match(card, /background="transparent"/);
  }
});

test('both managed author bundles retain every required reference and exact current sources', () => {
  const required = ['visual-selection.md', 'mobile-contract.md', 'composition-patterns.md', 'static-play.md', 'frames.md', 'colors.md', 'layout-recipes.md', 'rendering-model.md', 'workflow.md', 'measured-connectors.js'];
  for (const lang of ['zh', 'en']) {
    const bundle = managedSkillBundle({ engineRoot: root, name: 'garden-compose', lang });
    for (const name of required) assert.ok(bundle['references/' + name], lang + ': missing ' + name);
    for (const [name, bytes] of Object.entries(bundle).filter(([name]) => name.startsWith('references/'))) {
      const override = path.join(root, 'templates/skills-en/garden-compose', name);
      const source = lang === 'en' && fs.existsSync(override) ? override : path.join(skill, name);
      assert.deepEqual(bytes, fs.readFileSync(source), lang + ': stale ' + name);
    }
    for (const [name, bytes] of Object.entries(bundle).filter(([name]) => name.endsWith('.md'))) {
      for (const match of bytes.toString().matchAll(/references\/[a-z0-9-]+\.(?:md|js)/g)) assert.ok(bundle[match[0]], lang + ':' + name + ' missing reference ' + match[0]);
    }
  }
});
