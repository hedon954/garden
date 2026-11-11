import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('release workflow: mocked services, recovery and fail-closed gates', () => {
  const result = spawnSync('python3', ['-B', fileURLToPath(new URL('./release_workflow_test.py', import.meta.url))], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
