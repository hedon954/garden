"""Explicitly authorized local release execution; all remote mutations reconcile first."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import zipfile

import release as r

VERSION_FILES = ('package.json', 'package-lock.json', 'editors/vscode/package.json',
                 'editors/vscode/package-lock.json', 'editors/typora/package.json', 'editors/typora/manifest.json')
PIPELINE = ('version', 'test', 'pack', 'source-push', 'linux', 'tag-create', 'tag-push',
            'publish-ci', 'official', 'vsix', 'blog-pin', 'blog-check', 'blog-commit',
            'blog-push', 'blog-ci', 'pages-ci', 'production')


def changed_files(root, base, head):
    return set(filter(None, r.git(root, 'diff', '--name-only', base, head).splitlines()))


def remote_refs(root, remote, *refs):
    return dict((line.split()[1], line.split()[0]) for line in r.git(root, 'ls-remote', remote, *refs).splitlines())


def normal_push(root, remote, commit, branch):
    refs = remote_refs(root, remote, 'refs/heads/' + branch)
    old = refs.get('refs/heads/' + branch)
    r.require(old, 'Remote branch missing; do not create it implicitly')
    if old == commit:
        return {'commit': commit, 'remote': remote}
    r.git(root, 'fetch', remote, branch)
    r.command(['git', 'merge-base', '--is-ancestor', old, commit], root)
    return None


def write_bytes(path, data):
    temporary = path.with_name(path.name + '.release-tmp')
    temporary.write_bytes(data)
    temporary.replace(path)


def metadata_without_engine(path):
    data = json.loads(path.read_text())
    data.get('dependencies', {}).pop('hd-garden', None)
    return data


def wait_workflow(root, repo, commit, workflow, timeout, ref=None):
    deadline = time.monotonic() + timeout
    while True:
        runs = r.api(f'repos/{repo}/actions/runs?head_sha={commit}&per_page=100', root)['workflow_runs']
        runs = [x for x in runs if x['head_sha'] == commit and x.get('path') == workflow
                and (ref is None or x.get('head_branch') == ref)]
        if runs:
            run = max(runs, key=lambda x: x['id'])
            print('CI:', run['html_url'], run['status'], run.get('conclusion'), flush=True)
            if run['status'] == 'completed':
                r.require(run['conclusion'] == 'success', 'CI failed; no later stage: ' + run['html_url'])
                return {'url': run['html_url'], 'commit': commit}
        r.require(time.monotonic() < deadline, 'CI wait timed out; resume to re-read actual state')
        time.sleep(min(60, max(0, deadline - time.monotonic())))


class Executor:
    def __init__(self, root, blog, version, session='default', retry=None, timeout=1200):
        self.root, self.blog, self.version = root.resolve(), blog.resolve(), version
        r.require(self.root.name == 'garden' and self.blog == self.root.parent / 'garden-blog', 'Executor requires the named sibling checkouts')
        r.validate_layout(self.root, self.blog)
        r.require(version.count('.') == 2 and all(x.isdigit() and str(int(x)) == x for x in version.split('.')), 'Stable target version required')
        r.require(session and all(c.isalnum() or c in '-_' for c in session), 'Invalid session name')
        self.directory = self.root / '.garden/release-executor' / version / session
        self.retry, self.timeout = retry, timeout
        self.state = None

    def save(self):
        r.atomic_json(self.directory / 'state.json', self.state)

    def load(self):
        path = self.directory / 'state.json'
        if path.exists():
            self.state = json.loads(path.read_text())
            r.require(self.state['root'] == str(self.root) and self.state['blog'] == str(self.blog)
                      and self.state['version'] == self.version, 'State identity mismatch')
            return
        current_version, _ = r.preflight(self.root, self.blog)
        r.require(tuple(map(int, self.version.split('.'))) >= tuple(map(int, current_version.split('.'))), 'Refuse a release version downgrade')
        r.require(not r.git(self.root, 'status', '--porcelain=v1'), 'Commit source work first; never auto-commit feature/user edits')
        r.command(['git', 'diff', '--cached', '--quiet'], self.blog)
        r.require(r.registry(self.version) is None, 'Version already published; a new session cannot republish it')
        r.require(not remote_refs(self.root, 'upstream', 'refs/tags/v' + self.version), 'Remote tag occupied; never overwrite/delete')
        r.require(not r.git(self.root, 'tag', '--list', 'v' + self.version), 'Local tag occupied; reconcile manually')
        before = {'engine': r.snapshot(self.root), 'blog': r.snapshot(self.blog)}
        plans = {}
        for name in VERSION_FILES:
            p = self.root / name
            value = json.loads(p.read_text()); value['version'] = self.version
            if name.endswith('package-lock.json'): value['packages']['']['version'] = self.version
            data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
            out = self.directory / 'version-plan' / name; out.parent.mkdir(parents=True, exist_ok=True)
            write_bytes(out, data)
            plans[name] = {'before': r.digest(p.read_bytes()), 'after': r.digest(data)}
        self.state = {'root': str(self.root), 'blog': str(self.blog), 'version': self.version,
                      'base': r.git(self.root, 'rev-parse', 'HEAD'), 'blogBase': r.git(self.blog, 'rev-parse', 'HEAD'),
                      'protected': before, 'versionPlan': plans, 'blogMetadata': metadata_without_engine(self.blog / 'package.json'), 'stages': {}}
        self.save()

    def protect(self):
        r.protect(self.state['protected']['engine'], r.snapshot(self.root), VERSION_FILES)
        r.protect(self.state['protected']['blog'], r.snapshot(self.blog), ('package.json', 'package-lock.json'))
        r.require(metadata_without_engine(self.blog / 'package.json') == self.state['blogMetadata'], 'Unrelated blog manifest edits; preserve and stop')

    def cmd(self, args, cwd=None, name='command', timeout=1800):
        log = self.directory / (name + '.log')
        with log.open('ab') as stream:
            result = subprocess.run(args, cwd=cwd or self.root, stdin=subprocess.DEVNULL, stdout=stream, stderr=subprocess.STDOUT,
                                    timeout=timeout, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GH_PROMPT_DISABLED': '1'})
        r.require(result.returncode == 0, f'{name} failed ({result.returncode}); inspect {log}; no automatic mutation retry')

    def mutation(self, name, probe, action):
        self.protect()
        evidence = probe()
        if evidence is not None:
            self.state['stages'][name] = {'status': 'verified', 'evidence': evidence}; self.save(); return evidence
        previous = self.state['stages'].get(name, {})
        r.require(previous.get('status') not in ('intent', 'uncertain', 'verified') or self.retry == name,
                  name + ' has an unresolved previous attempt; inspect state, then explicitly --retry-stage ' + name)
        self.state['current'] = name
        self.state['stages'][name] = {'status': 'intent'}; self.save()
        print('EXECUTE:', name, flush=True)
        try:
            action()
            self.protect()
            evidence = probe()
            r.require(evidence is not None, name + ' returned without independently verified outcome')
        except BaseException as error:
            self.state['stages'][name] = {'status': 'uncertain', 'error': str(error)}; self.save()
            raise
        self.state['stages'][name] = {'status': 'verified', 'evidence': evidence}; self.save()
        return evidence

    def check(self, name, action):
        self.state['current'] = name; self.save(); self.protect()
        print('CHECK:', name, flush=True)
        try:
            result = action(); self.protect()
        except BaseException as error:
            self.state['stages'][name] = {'status': 'failed', 'error': str(error)}; self.save(); raise
        self.state['stages'][name] = {'status': 'verified', 'evidence': result}; self.save(); return result

    def expected_version_files(self):
        for name, plan in self.state['versionPlan'].items():
            data = (self.directory / 'version-plan' / name).read_bytes()
            r.require(r.digest(data) == plan['after'], 'Version plan changed: ' + name)
            current = r.digest((self.root / name).read_bytes())
            r.require(current in (plan['before'], plan['after']), 'User edited a version file; will not overwrite: ' + name)

    def version_probe(self):
        self.expected_version_files()
        head = r.git(self.root, 'rev-parse', 'HEAD')
        known = self.state.get('sourceCommit')
        if known: r.require(head == known, 'Source HEAD changed after release evidence; use a new reviewed session')
        planned = all(r.digest((self.root / n).read_bytes()) == v['after'] for n, v in self.state['versionPlan'].items())
        if not planned: return None
        if r.git(self.root, 'status', '--porcelain=v1'): return None
        if head != self.state['base']:
            r.require(r.git(self.root, 'rev-parse', 'HEAD^') == self.state['base'] and
                      changed_files(self.root, self.state['base'], head) <= set(VERSION_FILES) and
                      r.git(self.root, 'log', '-1', '--format=%s') == 'chore: release hd-garden ' + self.version,
                      'Unexpected source history; never reset or amend it')
        self.state['sourceCommit'] = head
        return {'commit': head}

    def index_guard(self, root, allowed, hashes):
        staged = set(filter(None, r.git(root, 'diff', '--cached', '--name-only').splitlines()))
        r.require(staged <= set(allowed), 'User files staged; never commit or unstage them')
        for name in staged:
            data = subprocess.check_output(['git', 'show', ':' + name], cwd=root)
            r.require(r.digest(data) == hashes[name], 'Staged content differs from planned release: ' + name)

    def version_action(self):
        r.require(r.git(self.root, 'rev-parse', 'HEAD') == self.state['base'], 'Source moved before version commit')
        self.expected_version_files()
        for name in ('package.json', 'package-lock.json'):
            write_bytes(self.root / name, (self.directory / 'version-plan' / name).read_bytes())
        self.cmd(['node', 'scripts/sync-editor-version.mjs'], name='version-sync')
        expected = {n: p['after'] for n, p in self.state['versionPlan'].items()}
        r.require(all(r.digest((self.root / n).read_bytes()) == h for n, h in expected.items()), 'Unified version bytes differ from reviewed plan')
        self.index_guard(self.root, VERSION_FILES, expected)
        if r.git(self.root, 'diff', 'HEAD', '--name-only'):
            self.cmd(['git', 'add', '--', *VERSION_FILES], name='version-add')
            self.cmd(['git', 'commit', '-m', 'chore: release hd-garden ' + self.version], name='version-commit')

    def source(self):
        r.require(r.git(self.root, 'rev-parse', 'HEAD') == self.state['sourceCommit'] and
                  not r.git(self.root, 'status', '--porcelain=v1'), 'Source commit/clean-tree evidence changed')
        return self.state['sourceCommit']

    def local_check(self, phase):
        self.source()
        self.cmd(['python3', '-B', str(self.root / 'scripts/release.py'), phase, '--run'], name=phase, timeout=max(self.timeout, 1800))
        return {'sourceCommit': self.source(), 'phase': phase, 'receiptDirectory': str(self.root / '.garden/release' / self.source() / phase)}

    def pack_proof(self):
        commit = self.source(); directory = self.root / '.garden/release' / commit
        proof = json.loads((directory / 'state.json').read_text())['phases']['pack']
        data = (directory / 'pack' / f'hd-garden-{self.version}.tgz').read_bytes()
        r.require(r.digest(data) == proof['npmSHA256'] and r.package_audit(data, self.version) == proof['editorSHA256'], 'Pack evidence changed; do not push/tag')
        r.source_audit(self.root, data)
        return proof

    def tag_probe(self, remote=False):
        name = 'refs/tags/v' + self.version; commit = self.source()
        if remote:
            refs = remote_refs(self.root, 'upstream', name, name + '^{}')
            if name not in refs: return None
            r.require(refs.get(name + '^{}') == commit and refs[name] == r.git(self.root, 'rev-parse', name), 'Remote tag collision; never overwrite')
            return {'tagObject': refs[name], 'commit': commit}
        if not r.git(self.root, 'tag', '--list', 'v' + self.version): return None
        r.require(r.git(self.root, 'cat-file', '-t', name) == 'tag' and r.git(self.root, 'rev-parse', name + '^{}') == commit,
                  'Local tag collision; never overwrite/delete')
        return {'tagObject': r.git(self.root, 'rev-parse', name), 'commit': commit}

    def before_tag(self):
        self.pack_proof(); r.linux_evidence(self.root, self.source())
        r.require(r.registry(self.version) is None, 'Version now occupied; never publish again')
        r.require(normal_push(self.root, 'upstream', self.source(), 'main') is not None, 'Source main not at tested commit')

    def official_assets(self):
        proof = r.published(self.root, self.version, self.source())
        release = r.api(f'repos/{r.ENGINE}/releases/tags/v{self.version}', self.root)
        folder = self.directory / 'official'; folder.mkdir(exist_ok=True)
        for path, expected in proof['editorSHA256'].items():
            name = Path(path).name; destination = folder / name
            if not destination.exists() or r.digest(destination.read_bytes()) != expected:
                asset = next(a for a in release['assets'] if a['name'] == name)
                data = r.http(asset['browser_download_url']); r.require(r.digest(data) == expected, 'Release asset changed during download')
                write_bytes(destination, data)
        return proof

    def vsix_probe(self):
        listed = r.command(['cursor', '--list-extensions', '--show-versions'], self.root).splitlines()
        if 'hedon954.garden-ui@' + self.version not in listed: return None
        candidates = [p for p in (Path.home() / '.cursor/extensions').glob('hedon954.garden-ui-' + self.version + '*')
                      if (p / 'package.json').exists() and json.loads((p / 'package.json').read_text()).get('version') == self.version]
        r.require(len(candidates) == 1, 'Installed Cursor path ambiguous; stop for OS/operator review')
        installed = candidates[0]; archive = self.directory / 'official' / f'garden-ui-{self.version}.vsix'
        with zipfile.ZipFile(archive) as z:
            manifest = json.loads((installed / 'package.json').read_text()); manifest.pop('__metadata', None)
            r.require(manifest == json.loads(z.read('extension/package.json')), 'Installed extension manifest differs beyond Cursor metadata')
            for name in z.namelist():
                if not name.startswith('extension/') or name.endswith('/') or name == 'extension/package.json': continue
                p = installed / name.removeprefix('extension/')
                r.require(p.is_file() and p.read_bytes() == z.read(name), 'Installed VSIX differs: ' + name)
        return {'version': self.version, 'path': str(installed), 'reload': False}

    def pin_probe(self):
        target = json.loads((self.blog / 'package.json').read_text())['dependencies']['hd-garden']
        if target != '^' + self.version: return None
        try: r.consumer(self.blog, self.version)
        except (RuntimeError, FileNotFoundError, KeyError): return None
        return {'version': self.version, 'files': {n: r.digest((self.blog / n).read_bytes()) for n in ('package.json', 'package-lock.json')}}

    def blog_commit_probe(self):
        head = r.git(self.blog, 'rev-parse', 'HEAD'); base = self.state['blogBase']
        expected = self.state['stages']['blog-pin']['evidence']['files']
        r.require(all(r.digest((self.blog / n).read_bytes()) == h for n, h in expected.items()), 'Blog dependency files changed after verification')
        if head == base: return None
        r.require(r.git(self.blog, 'rev-parse', 'HEAD^') == base and changed_files(self.blog, base, head) <= set(expected)
                  and r.git(self.blog, 'log', '-1', '--format=%s') == 'chore: upgrade Garden to published ' + self.version,
                  'Blog history moved; preserve it, do not rewrite')
        for name, expected_hash in expected.items():
            r.require(r.digest(subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=self.blog)) == expected_hash,
                      'Committed blog dependency differs')
        self.state['blogCommit'] = head
        return {'commit': head, 'files': list(expected)}

    def blog_commit_action(self):
        expected = self.state['stages']['blog-pin']['evidence']['files']
        self.index_guard(self.blog, expected, expected)
        self.cmd(['git', 'add', '--', *expected], cwd=self.blog, name='blog-add')
        self.cmd(['git', 'commit', '-m', 'chore: upgrade Garden to published ' + self.version], cwd=self.blog, name='blog-commit')

    def execute(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        with (self.root / '.garden/release-executor/lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.load(); self.protect()
            meta = r.registry(self.version)
            r.require(meta is None or meta.get('gitHead') == self.state.get('sourceCommit'), 'Occupied version does not belong to this session')
            self.mutation('version', self.version_probe, self.version_action)
            self.check('test', lambda: self.local_check('test'))
            self.check('pack', lambda: self.local_check('pack')); self.pack_proof()
            sha = self.source()
            self.mutation('source-push', lambda: normal_push(self.root, 'upstream', sha, 'main'),
                          lambda: self.cmd(['git', 'push', 'upstream', sha + ':refs/heads/main'], name='source-push', timeout=120))
            self.check('linux', lambda: (wait_workflow(self.root, r.ENGINE, sha, '.github/workflows/verify.yml', self.timeout, 'main'), r.linux_evidence(self.root, sha))[1])
            def create_tag():
                self.before_tag(); self.cmd(['git', 'tag', '-a', 'v' + self.version, sha, '-m', 'Release ' + self.version], name='tag-create')
            self.mutation('tag-create', self.tag_probe, create_tag)
            def push_tag():
                self.before_tag(); self.cmd(['git', 'push', 'upstream', 'refs/tags/v' + self.version], name='tag-push', timeout=120)
            self.mutation('tag-push', lambda: self.tag_probe(True), push_tag)
            self.check('publish-ci', lambda: wait_workflow(self.root, r.ENGINE, sha, '.github/workflows/publish.yml', self.timeout, 'v' + self.version))
            self.check('official', self.official_assets)
            self.mutation('vsix', self.vsix_probe, lambda: self.cmd(['cursor', '--install-extension', str(self.directory / 'official' / f'garden-ui-{self.version}.vsix')], name='vsix-install', timeout=180))
            self.mutation('blog-pin', self.pin_probe, lambda: self.cmd(['npm', 'install', 'hd-garden@^' + self.version, '--registry=https://registry.npmjs.org'], cwd=self.blog, name='blog-pin'))
            self.check('blog-check', lambda: self.local_check('blog-check'))
            self.mutation('blog-commit', self.blog_commit_probe, self.blog_commit_action)
            blog_sha = self.state['blogCommit']
            self.mutation('blog-push', lambda: normal_push(self.blog, 'origin', blog_sha, 'main'),
                          lambda: self.cmd(['git', 'push', 'origin', blog_sha + ':refs/heads/main'], cwd=self.blog, name='blog-push', timeout=120))
            self.check('blog-ci', lambda: wait_workflow(self.root, r.BLOG, blog_sha, '.github/workflows/pages.yml', self.timeout, 'main'))
            snapshot = r.api(f'repos/{r.PAGES}/branches/main', self.root)['commit']
            r.require(snapshot['commit']['message'] == 'Deploy ' + blog_sha, 'Generated snapshot is not this source commit')
            self.check('pages-ci', lambda: wait_workflow(self.root, r.PAGES, snapshot['sha'], 'dynamic/pages/pages-build-deployment', self.timeout))
            self.check('production', lambda: r.deployed(self.root, self.blog))
            self.state['current'] = 'complete'; self.save()
            return {'version': self.version, 'sourceCommit': sha, 'blogCommit': blog_sha, 'state': str(self.directory / 'state.json')}


def entry(root, blog, args):
    r.require(args.version, 'execute requires --version')
    r.require(not args.run or args.confirm == 'release hd-garden ' + args.version,
              'Execution refused: obtain current user release approval, then supply --confirm "release hd-garden VERSION"')
    runner = Executor(root, blog, args.version, args.session, args.retry_stage, args.wait_seconds)
    if not args.run:
        path = runner.directory / 'state.json'
        previous = json.loads(path.read_text()) if path.exists() else None
        return {'dryRun': True, 'pipeline': PIPELINE, 'version': args.version, 'state': str(path),
                'lastStage': previous.get('current') if previous else None,
                'warning': 'No network or mutations in this plan. --run requires current approval and exact confirmation.'}
    return runner.execute()
