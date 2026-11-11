#!/usr/bin/env python3
"""Resumable local release checks. Never publishes, tags, commits, or pushes."""
import argparse
import base64
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import urllib.error
import urllib.request
import zipfile

PHASES = ('test', 'pack', 'linux', 'tag-plan', 'published', 'blog-check', 'deployed')
ENGINE = 'hedon954/garden'
BLOG = 'hedon954/garden-blog'
PAGES = 'hedon954/hedon954.github.io'


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def command(args, cwd):
    return subprocess.check_output(args, cwd=cwd, stderr=subprocess.PIPE).decode().rstrip('\n')


def git(root, *args):
    return command(['git', *args], root)


def atomic_json(path, data):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def snapshot(root):
    names = git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')
    result = {}
    for name in sorted(set(filter(None, names))):
        p = root / name
        result[name] = ('link:' + os.readlink(p) if p.is_symlink() else
                        digest(p.read_bytes()) if p.is_file() else 'MISSING')
    return result


def protect(before, after, allowed=()):
    changed = [p for p in before.keys() | after.keys()
               if p not in allowed and before.get(p) != after.get(p)]
    require(not changed, 'Protected files changed; preserve and review manually: ' + ', '.join(sorted(changed)))


def canonical_remote(url):
    return url.removesuffix('.git').replace('git@github.com:', 'https://github.com/')


def preflight(root, blog):
    require(canonical_remote(git(root, 'remote', 'get-url', 'origin')) == 'https://github.com/' + BLOG,
            'origin must be garden-blog; never infer the push remote')
    require(canonical_remote(git(root, 'remote', 'get-url', 'upstream')) == 'https://github.com/' + ENGINE,
            'upstream must be garden engine')
    require(git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir') ==
            git(blog, 'rev-parse', '--path-format=absolute', '--git-common-dir'), 'Expected existing shared worktrees')
    version = json.loads((root / 'package.json').read_text())['version']
    require(len(version.split('.')) == 3 and all(p.isdigit() for p in version.split('.')), 'Stable version required')
    command(['node', 'scripts/sync-editor-version.mjs', '--check'], root)
    lock = json.loads((root / 'package-lock.json').read_text())
    require(lock['version'] == version == lock['packages']['']['version'], 'Root lock version mismatch')
    return version, git(root, 'rev-parse', 'HEAD')


def http(url):
    request = urllib.request.Request(url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'Garden-release-check'})
    with urllib.request.urlopen(request, timeout=45) as response:
        require(response.status == 200, 'HTTP not 200: ' + url)
        return response.read()


def registry(version):
    try:
        return json.loads(http('https://registry.npmjs.org/hd-garden/' + version))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def api(path, root):
    return json.loads(command(['gh', 'api', path], root))


def tar_files(data):
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        return {m.name.removeprefix('package/'): archive.extractfile(m).read()
                for m in archive.getmembers() if m.isfile()}


def package_audit(data, version, assets=None):
    files = tar_files(data)
    require(json.loads(files['package.json'])['version'] == version, 'npm version mismatch')
    paths = [f'editors/dist/vscode/garden-ui-{version}.vsix', f'editors/dist/garden-typora-{version}.zip']
    for p in paths:
        require(p in files, 'Missing packaged editor: ' + p)
        if assets is not None:
            require(files[p] == assets[Path(p).name], 'Editor bytes mismatch: ' + p)
    with zipfile.ZipFile(io.BytesIO(files[paths[0]])) as archive:
        require(json.loads(archive.read('extension/package.json'))['version'] == version, 'VSIX version mismatch')
    with zipfile.ZipFile(io.BytesIO(files[paths[1]])) as archive:
        manifests = [p for p in archive.namelist() if p.endswith('/manifest.json')]
        require(len(manifests) == 1 and json.loads(archive.read(manifests[0]))['version'] == version,
                'Typora version mismatch')
    return {p: digest(files[p]) for p in paths}


def source_audit(root, data):
    tracked = set(git(root, 'ls-files', '-z').split('\0'))
    compared = 0
    for name, content in tar_files(data).items():
        if name in tracked:
            require((root / name).read_bytes() == content, 'Packed source differs from clean commit: ' + name)
            compared += 1
    require(compared > 0, 'No source files verified in archive')
    return compared


def linux_evidence(root, commit):
    runs = api(f'repos/{ENGINE}/actions/runs?head_sha={commit}&per_page=100', root)['workflow_runs']
    good = [r for r in runs if r['head_sha'] == commit and r.get('head_branch') == 'main'
            and r.get('event') == 'push' and r.get('path') == '.github/workflows/verify.yml'
            and r.get('status') == 'completed' and r.get('conclusion') == 'success']
    require(good, 'No successful main Linux full-test workflow for this exact commit; do not tag')
    run = max(good, key=lambda r: r['id'])
    jobs = api(f'repos/{ENGINE}/actions/runs/{run["id"]}/jobs?per_page=100', root)['jobs']
    job = next((j for j in jobs if j['name'] == 'verify'), None)
    require(job and job['conclusion'] == 'success' and any(s.startswith('ubuntu') for s in job['labels']),
            'Linux verify job missing, skipped, or failed')
    steps = {s['name']: s.get('conclusion') for s in job['steps']}
    for name in ['Run npm test', 'A new site from garden init installs the packed engine and builds', 'Verify GitHub Pages export']:
        require(steps.get(name) == 'success', 'Required CI step did not pass: ' + name)
    return {'run': run['html_url'], 'commit': commit}


def tag_plan(root, version, commit):
    proof = linux_evidence(root, commit)
    require(registry(version) is None, 'Version already published: never overwrite or republish')
    require(not git(root, 'ls-remote', '--tags', 'upstream', 'refs/tags/v' + version), 'Remote tag already exists')
    local = command(['git', 'tag', '--list', 'v' + version], root)
    require(not local, 'Local tag already exists; reconcile manually, never delete or overwrite')
    require(git(root, 'ls-remote', 'upstream', 'refs/heads/main').split()[0] == commit,
            'upstream/main must equal the tested commit')
    return {**proof, 'manualOnly': [f'git tag -a v{version} {commit} -m "Release {version}"',
                                   f'git push upstream refs/tags/v{version}']}


def npm_archive(metadata):
    require(metadata['dist']['tarball'].startswith('https://registry.npmjs.org/hd-garden/-/'), 'Unexpected npm artifact URL')
    data = http(metadata['dist']['tarball'])
    integrity = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode()
    require(integrity in metadata['dist']['integrity'].split(), 'Official npm SHA512 mismatch')
    return data


def published(root, version, commit):
    metadata = registry(version)
    require(metadata and metadata.get('gitHead') == commit, 'Published gitHead mismatch or version absent')
    remote = git(root, 'ls-remote', 'upstream', 'refs/tags/v' + version + '^{}')
    require(remote and remote.split()[0] == commit, 'Annotated release tag does not resolve to source commit')
    data = npm_archive(metadata)
    release = api(f'repos/{ENGINE}/releases/tags/v{version}', root)
    require(not release['draft'] and not release['prerelease'], 'Not a formal Release')
    assets = {a['name']: http(a['browser_download_url']) for a in release['assets']
              if a['name'] in [f'garden-ui-{version}.vsix', f'garden-typora-{version}.zip']}
    hashes = package_audit(data, version, assets)
    return {'gitHead': commit, 'npmSHA256': digest(data), 'sourceFiles': source_audit(root, data), 'release': release['html_url'], 'editorSHA256': hashes}


def consumer(blog, version):
    require(json.loads((blog / 'package.json').read_text())['dependencies']['hd-garden'] == '^' + version,
            'First explicitly install hd-garden@^VERSION from registry; this tool never changes dependencies')
    installed = blog / 'node_modules/hd-garden'
    require(installed.is_dir() and not installed.is_symlink(), 'Consumer must not be a local file link')
    lock = json.loads((blog / 'package-lock.json').read_text())['packages']['node_modules/hd-garden']
    metadata = registry(version)
    require(metadata and lock.get('version') == version and not lock.get('link')
            and lock.get('resolved') == metadata['dist']['tarball']
            and lock.get('integrity') == metadata['dist']['integrity'], 'Registry consumer lock mismatch')
    require(json.loads((installed / 'package.json').read_text())['version'] == version, 'Installed version mismatch')
    for name, data in tar_files(npm_archive(metadata)).items():
        p = installed / name
        require(p.resolve().is_relative_to(installed.resolve()) and p.is_file() and not p.is_symlink()
                and p.read_bytes() == data, 'Installed registry bytes differ: ' + name)


def deployed(root, blog):
    commit = git(blog, 'rev-parse', 'HEAD')
    require(git(blog, 'ls-remote', 'origin', 'refs/heads/main').split()[0] == commit, 'Blog is not pushed normally yet')
    def successful(repo, sha, path):
        runs = api(f'repos/{repo}/actions/runs?head_sha={sha}&per_page=100', root)['workflow_runs']
        good = [r for r in runs if r.get('head_sha') == sha and r.get('path') == path
                and r.get('status') == 'completed' and r.get('conclusion') == 'success']
        require(good, 'No successful deployment for ' + repo + ' at ' + sha)
        return max(good, key=lambda r: r['id'])['html_url']
    source_run = successful(BLOG, commit, '.github/workflows/pages.yml')
    branch = api(f'repos/{PAGES}/branches/main', root)['commit']
    require(branch['commit']['message'] == 'Deploy ' + commit, 'Public snapshot is not this blog commit')
    pages_run = successful(PAGES, branch['sha'], 'dynamic/pages/pages-build-deployment')
    tree = api(f'repos/{PAGES}/git/trees/{branch["sha"]}?recursive=1', root)
    require(not tree.get('truncated'), 'Incomplete snapshot tree')
    from html.parser import HTMLParser
    from urllib.parse import unquote, urljoin, urlsplit
    blobs = {x['path']: x['sha'] for x in tree['tree'] if x['type'] == 'blob'}
    assets = set()
    class Resources(HTMLParser):
        def handle_starttag(self, tag, attributes):
            a = dict(attributes)
            value = a.get('src') if tag == 'script' else a.get('href') if tag == 'link' else None
            if value:
                u = urlsplit(urljoin('https://hedon.top/', value))
                if u.netloc == 'hedon.top' and u.path.endswith(('.css', '.js')):
                    assets.add(unquote(u.path).lstrip('/'))
    def check(path):
        url = 'https://hedon.top/' + path.removesuffix('index.html')
        data = http(url)
        sha = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        require(blobs.get(path) == sha, 'Production differs from new snapshot: ' + url)
        return {'url': url, 'sha256': digest(data)}, data
    pages = []
    targets = ['index.html'] + [p for p in blobs if p.startswith('blog/') and p.endswith('/index.html') and 'inspired' in p.lower()]
    require(len(targets) > 1, 'Expected actual Inspired article in snapshot')
    for path in targets:
        info, data = check(path); pages.append(info); Resources().feed(data.decode())
    evidence = []
    for path in sorted(assets):
        info, _ = check(path); evidence.append(info)
    require(evidence, 'No production CSS/JS discovered')
    return {'sourceCI': source_run, 'pagesCI': pages_run, 'snapshot': branch['sha'], 'pages': pages, 'assets': evidence}


def run_steps(root, directory, steps):
    evidence = []
    for number, (cwd, args, extra_env) in enumerate(steps):
        receipt = directory / f'{number}.json'
        log = directory / f'{number}.log'
        inputs = snapshot(cwd)
        identity = {'cwd': str(cwd), 'argv': args, 'env': extra_env, 'inputs': inputs}
        if receipt.exists():
            saved = json.loads(receipt.read_text())
            if saved['identity'] == identity and saved['exit'] == 0 and log.exists() and saved['logSHA256'] == digest(log.read_bytes()):
                evidence.append(saved); continue
        with log.open('wb') as stream:
            result = subprocess.run(args, cwd=cwd, env={**os.environ, **extra_env}, stdout=stream, stderr=subprocess.STDOUT)
        saved = {'identity': identity, 'exit': result.returncode, 'logSHA256': digest(log.read_bytes())}
        atomic_json(receipt, saved)
        protect(inputs, snapshot(cwd))
        require(result.returncode == 0, f'Failed {args}; see {log}; no later phase executed')
        evidence.append(saved)
    return evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', nargs='?', default='plan', choices=['plan', 'status', *PHASES])
    parser.add_argument('--blog', type=Path)
    parser.add_argument('--run', action='store_true', help='execute only the named local/read-only-check phase; never external writes')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    blog = (args.blog or root.parent / 'garden-blog').resolve()
    version, commit = preflight(root, blog)
    directory = root / '.garden/release' / commit
    if args.phase in ('plan', 'status') or not args.run:
        state = directory / 'state.json'
        print(json.dumps({'version': version, 'commit': commit, 'phases': PHASES, 'requested': args.phase,
                          'dryRun': True, 'recordedPhases': list(json.loads(state.read_text())['phases']) if state.exists() else [],
                          'statePath': str(state),
                          'externalWrites': 'NEVER: main/tag/blog commits and pushes require manual current authorization'}, indent=2))
        return
    require(not git(root, 'status', '--porcelain=v1'), 'Commit/review source first; checks must bind to clean engine HEAD')
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / 'lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        state_path = directory / 'state.json'
        before = {'engine': snapshot(root), 'blog': snapshot(blog)}
        state = json.loads(state_path.read_text()) if state_path.exists() else {'commit': commit, 'version': version, 'protected': before, 'phases': {}}
        require(state['commit'] == commit and state['version'] == version, 'Stale evidence identity')
        for name in before:
            protect(state['protected'][name], before[name], ('package.json', 'package-lock.json') if name == 'blog' else ())
        phase_dir = directory / args.phase
        phase_dir.mkdir(exist_ok=True)
        atomic_json(state_path, state)
        if args.phase == 'test':
            result = run_steps(root, phase_dir, [(root, ['npm', 'test'], {})])
        elif args.phase == 'pack':
            require((directory / 'test/0.json').exists(), 'Run test phase first')
            test = json.loads((directory / 'test/0.json').read_text())
            require(test['exit'] == 0 and test['identity']['inputs'] == snapshot(root)
                    and test['logSHA256'] == digest((directory / 'test/0.log').read_bytes()), 'Tests missing or stale')
            run_steps(root, phase_dir, [(root, ['npm', 'pack', '--json', '--pack-destination', str(phase_dir)], {})])
            data = (phase_dir / f'hd-garden-{version}.tgz').read_bytes()
            assets = {f'garden-ui-{version}.vsix': (root / f'editors/dist/vscode/garden-ui-{version}.vsix').read_bytes(),
                      f'garden-typora-{version}.zip': (root / f'editors/dist/garden-typora-{version}.zip').read_bytes()}
            result = {'npmSHA256': digest(data), 'sourceFiles': source_audit(root, data), 'editorSHA256': package_audit(data, version, assets)}
        elif args.phase == 'linux': result = linux_evidence(root, commit)
        elif args.phase == 'tag-plan':
            packed = state['phases'].get('pack')
            archive = directory / 'pack' / f'hd-garden-{version}.tgz'
            require(packed and archive.exists() and packed['npmSHA256'] == digest(archive.read_bytes()),
                    'Pack proof missing or artifact changed; do not tag')
            require(packed['editorSHA256'] == package_audit(archive.read_bytes(), version), 'Package evidence changed')
            result = tag_plan(root, version, commit)
        elif args.phase == 'published': result = published(root, version, commit)
        elif args.phase == 'blog-check':
            consumer(blog, version)
            result = run_steps(root, phase_dir, [(blog, ['node', 'scripts/check-lockfile-registry.mjs'], {}),
                (blog, ['./node_modules/.bin/garden', 'verify'], {}), (blog, ['npm', 'run', 'build'], {'STATIC_EXPORT': '1'}),
                (blog, ['npm', 'run', 'pages:validate'], {}), (blog, ['./node_modules/.bin/garden', 'verify', '--rendered'], {})])
        else: result = deployed(root, blog)
        for name, path in [('engine', root), ('blog', blog)]: protect(before[name], snapshot(path))
        state['phases'][args.phase] = result
        atomic_json(state_path, state)
        print(json.dumps({'phase': args.phase, 'commit': commit, 'version': version, 'evidence': {'verifiedSteps': len(result)} if isinstance(result, list) else result, 'statePath': str(state_path)}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError, KeyError, ValueError, tarfile.TarError, zipfile.BadZipFile) as error:
        print('STOP:', str(error), file=sys.stderr)
        sys.exit(1)
