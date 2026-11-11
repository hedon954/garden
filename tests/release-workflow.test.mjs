import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('release workflow: execution, mocked services, recovery and fail-closed gates', () => {
  const result = spawnSync('python3', ['-B', '-m', 'unittest', 'discover', '-s', fileURLToPath(new URL('.', import.meta.url)), '-p', 'release_*_test.py'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
