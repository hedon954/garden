"""No npm/GitHub writes or live external services in these regression tests."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('release', Path(__file__).resolve().parents[1] / 'scripts/release.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


def package(version='1.2.3', vsix_version=None):
    def zipped(files):
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as z:
            for name, value in files.items(): z.writestr(name, json.dumps(value))
        return out.getvalue()
    assets = {f'garden-ui-{version}.vsix': zipped({'extension/package.json': {'version': vsix_version or version}}),
              f'garden-typora-{version}.zip': zipped({'garden/manifest.json': {'version': version}})}
    files = {'package/package.json': json.dumps({'version': version}).encode(),
             f'package/editors/dist/vscode/garden-ui-{version}.vsix': assets[f'garden-ui-{version}.vsix'],
             f'package/editors/dist/garden-typora-{version}.zip': assets[f'garden-typora-{version}.zip']}
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w:gz') as archive:
        for name, data in files.items():
            member = tarfile.TarInfo(name); member.size = len(data); archive.addfile(member, io.BytesIO(data))
    return out.getvalue(), assets


class ReleaseTests(unittest.TestCase):
    def test_default_and_phase_without_run_are_read_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for args in [[], ['pack'], ['status']]:
                with patch.object(r, '__file__', str(root/'scripts/release.py')), patch.object(sys, 'argv', ['release.py', *args]), patch.object(r, 'preflight', return_value=('1.2.3', 'a'*40)), patch.object(r, 'run_steps') as run, contextlib.redirect_stdout(io.StringIO()) as output:
                    r.main(); self.assertTrue(json.loads(output.getvalue())['dryRun']); run.assert_not_called()
            self.assertFalse((root/'.garden').exists())

    def test_user_edits_are_not_restored_or_silently_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root/'note.md').write_text('user newest edit')
            with patch.object(r, 'git', return_value='note.md\0'):
                after = r.snapshot(root)
            with self.assertRaisesRegex(RuntimeError, 'Protected files changed'):
                r.protect({'note.md': 'older-hash'}, after)
            self.assertEqual((root/'note.md').read_text(), 'user newest edit')

    def test_new_untracked_files_and_deletions_are_protected(self):
        for before, after in [({}, {'new.md': 'user'}), ({'old.md': 'user'}, {'old.md': 'MISSING'})]:
            with self.assertRaises(RuntimeError): r.protect(before, after)
        r.protect({'package.json': 'a', 'note.md': 'x'}, {'package.json': 'b', 'note.md': 'x'}, ('package.json',))

    def test_resume_after_interruption_skips_verified_success(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(r, 'snapshot', return_value={}):
            root = Path(tmp); calls = []
            def execute(args, **kwargs):
                calls.append(args[0]); kwargs['stdout'].write(b'real log bytes')
                if len(calls) == 2: raise KeyboardInterrupt()
                return subprocess.CompletedProcess(args, 0)
            steps = [(root, ['one'], {}), (root, ['two'], {})]
            with patch.object(r.subprocess, 'run', side_effect=execute):
                with self.assertRaises(KeyboardInterrupt): r.run_steps(root, root, steps)
                r.run_steps(root, root, steps)
            self.assertEqual(calls, ['one', 'two', 'two'])

    def test_missing_or_modified_log_is_not_success_evidence(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(r, 'snapshot', return_value={}):
            root = Path(tmp)
            def execute(args, **kwargs):
                kwargs['stdout'].write(b'passed'); return subprocess.CompletedProcess(args, 0)
            with patch.object(r.subprocess, 'run', side_effect=execute) as run:
                r.run_steps(root, root, [(root, ['test'], {})]); (root/'0.log').write_text('tampered')
                r.run_steps(root, root, [(root, ['test'], {})]); self.assertEqual(run.call_count, 2)

    def test_failed_command_never_runs_next_command(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(r, 'snapshot', return_value={}), patch.object(r.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1)) as run:
            root = Path(tmp)
            with self.assertRaises(RuntimeError): r.run_steps(root, root, [(root, ['test'], {}), (root, ['pack'], {})])
            self.assertEqual(run.call_count, 1)

    def test_ci_failure_never_reaches_tag_plan(self):
        with patch.object(r, 'api', return_value={'workflow_runs': [{'head_sha': 'sha', 'head_branch': 'main', 'event': 'push', 'path': '.github/workflows/verify.yml', 'status': 'completed', 'conclusion': 'failure'}]}), patch.object(r, 'registry') as registry, patch.object(r, 'git') as git:
            with self.assertRaisesRegex(RuntimeError, 'do not tag'): r.tag_plan(Path('.'), '1.2.3', 'sha')
            registry.assert_not_called(); git.assert_not_called()

    def test_ci_success_wrong_commit_is_not_evidence(self):
        with patch.object(r, 'api', return_value={'workflow_runs': [{'head_sha': 'other', 'head_branch': 'main', 'event': 'push', 'path': '.github/workflows/verify.yml', 'status': 'completed', 'conclusion': 'success'}]}):
            with self.assertRaises(RuntimeError): r.linux_evidence(Path('.'), 'sha')

    def test_skipped_full_test_step_does_not_open_tag_gate(self):
        runs = {'workflow_runs': [{'id': 1, 'head_sha': 'sha', 'head_branch': 'main', 'event': 'push', 'path': '.github/workflows/verify.yml', 'status': 'completed', 'conclusion': 'success', 'html_url': 'mock-run'}]}
        jobs = {'jobs': [{'name': 'verify', 'conclusion': 'success', 'labels': ['ubuntu-latest'], 'steps': [{'name': 'Run npm test', 'conclusion': 'skipped'}]}]}
        with patch.object(r, 'api', side_effect=[runs, jobs]):
            with self.assertRaisesRegex(RuntimeError, 'did not pass'): r.linux_evidence(Path('.'), 'sha')

    def test_published_version_blocks_tag_without_mutation(self):
        with patch.object(r, 'linux_evidence', return_value={'commit': 'sha'}), patch.object(r, 'registry', return_value={'version': '1.2.3'}), patch.object(r, 'git') as git:
            with self.assertRaisesRegex(RuntimeError, 'already published'): r.tag_plan(Path('.'), '1.2.3', 'sha')
            git.assert_not_called()

    def test_remote_uncertainty_is_not_treated_as_version_absence(self):
        with patch.object(r, 'http', side_effect=TimeoutError('offline')):
            with self.assertRaises(TimeoutError): r.registry('1.2.3')

    def test_matching_npm_vsix_and_typora_bytes(self):
        data, assets = package(); self.assertEqual(len(r.package_audit(data, '1.2.3', assets)), 2)

    def test_asset_byte_mismatch_is_rejected(self):
        data, assets = package(); assets['garden-ui-1.2.3.vsix'] = b'not the release'
        with self.assertRaisesRegex(RuntimeError, 'bytes mismatch'): r.package_audit(data, '1.2.3', assets)

    def test_embedded_editor_version_mismatch_is_rejected(self):
        data, _ = package(vsix_version='1.2.2')
        with self.assertRaisesRegex(RuntimeError, 'VSIX version mismatch'): r.package_audit(data, '1.2.3')

    def test_atomic_state_overwrites_abandoned_temporary_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'state.json'; r.atomic_json(path, {'first': True})
            path.with_suffix('.tmp').write_text('interrupted write'); r.atomic_json(path, {'second': True})
            self.assertEqual(json.loads(path.read_text()), {'second': True})

    def test_filename_whitespace_and_symlink_are_protected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root/' note.md').write_text('user'); (root/'link').symlink_to(' note.md')
            with patch.object(r, 'git', return_value=' note.md\0link\0'):
                result = r.snapshot(root)
            self.assertIn(' note.md', result); self.assertEqual(result['link'], 'link: note.md')

    def test_packed_source_mismatch_is_rejected(self):
        data, _ = package()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root/'package.json').write_text('{"version":"9.9.9"}')
            with patch.object(r, 'git', return_value='package.json\0'):
                with self.assertRaisesRegex(RuntimeError, 'source differs'): r.source_audit(root, data)

    def test_wrong_remote_mapping_fails_closed(self):
        with patch.object(r, 'git', return_value='git@github.com:hedon954/garden.git'):
            with self.assertRaisesRegex(RuntimeError, 'origin must be garden-blog'): r.preflight(Path('.'), Path('../blog'))


if __name__ == '__main__': unittest.main()
