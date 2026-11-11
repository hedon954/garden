"""Real temporary Git histories; npm, GitHub, Cursor and network are simulated."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import release_executor as x


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.PIPE).decode().strip()


class SimulatedExecutor(x.Executor):
    """Only external effects are replaced; version/tag/blog commits use real Git."""
    def __init__(self, root, blog, env, **kwargs):
        super().__init__(root, blog, '1.2.3', **kwargs); self.env = env

    def cmd(self, args, cwd=None, name='command', timeout=1800):
        self.env['commands'].append((name, args))
        if args[:2] == ['git', 'push']:
            remote = args[2]; refspec = args[3]
            if refspec.startswith('refs/tags/'):
                self.env['tag'] = git(self.root, 'rev-parse', refspec)
                self.env['tagCommit'] = self.source()
            else: self.env[remote] = refspec.split(':')[0]
            if self.env.pop('disconnect', False): raise ConnectionError('response lost after successful push')
        elif args[:2] == ['cursor', '--install-extension']: self.env['installed'] = True
        elif args[:2] == ['npm', 'install']:
            p = self.blog/'package.json'; d=json.loads(p.read_text());d['dependencies']['hd-garden']='^1.2.3';x.r.atomic_json(p,d)
            x.r.atomic_json(self.blog/'package-lock.json',{'version':'1.2.3','packages':{'node_modules/hd-garden':{'version':'1.2.3'}}})
        else: super().cmd(args, cwd, name, timeout)

    def local_check(self, phase):
        return {'commit': self.source(), 'phase': phase, 'fixture': True}

    def pack_proof(self): return {'fixturePackageVerified': True}
    def official_assets(self): return {'fixtureOfficialBytesVerified': True}
    def vsix_probe(self): return {'verified':True,'reload':False} if self.env.get('installed') else None
    def pin_probe(self):
        if json.loads((self.blog/'package.json').read_text())['dependencies']['hd-garden'] != '^1.2.3':return None
        return {'files':{n:x.r.digest((self.blog/n).read_bytes()) for n in ['package.json','package-lock.json']}}


class ExecutorTests(unittest.TestCase):
    def setUp(self):
        # This temporary repository is a branch fixture, not the outer release tag.
        refs = patch.dict(os.environ, {"GITHUB_REF_TYPE": "branch", "GITHUB_REF_NAME": "engine"})
        refs.start(); self.addCleanup(refs.stop)
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'garden'; self.blog=Path(self.tmp.name)/'garden-blog';self.root.mkdir()
        git(self.root,'init','-b','engine');git(self.root,'config','user.name','Fixture');git(self.root,'config','user.email','fixture@example.invalid')
        (self.root/'.gitignore').write_text('.garden/\n')
        for name in x.VERSION_FILES:
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);d={'name':'hd-garden','version':'1.2.2'}
            if name.endswith('package-lock.json'):d['packages']={'':{'version':'1.2.2'}}
            p.write_text(json.dumps(d,indent=2)+'\n')
        (self.root/'scripts').mkdir();(self.root/'scripts/sync-editor-version.mjs').write_bytes((ROOT/'scripts/sync-editor-version.mjs').read_bytes())
        git(self.root,'add','.');git(self.root,'commit','-m','initial source');git(self.root,'worktree','add','-b','main',str(self.blog),'HEAD')
        p=self.blog/'package.json';d=json.loads(p.read_text());d['name']='garden-blog';d['dependencies']={'hd-garden':'file:../garden'};p.write_text(json.dumps(d,indent=2)+'\n')
        (self.blog/'note.md').write_text('published');git(self.blog,'add','.');git(self.blog,'commit','-m','initial blog');(self.blog/'note.md').write_text('PRIVATE USER DRAFT')
        git(self.root,'remote','add','origin','git@github.com:hedon954/garden-blog.git');git(self.root,'remote','add','upstream','git@github.com:hedon954/garden.git')
        self.env={'commands':[],'upstream':git(self.root,'rev-parse','HEAD'),'origin':git(self.blog,'rev-parse','HEAD')}
        self.registry=patch.object(x.r,'registry',return_value=None);self.registry.start();self.addCleanup(self.registry.stop)
        self.no_network=patch.object(x.r.urllib.request,'urlopen',side_effect=AssertionError('Live network forbidden in executor tests'));self.no_network.start();self.addCleanup(self.no_network.stop)

    def runner(self, simulated=False, **kwargs):
        obj=SimulatedExecutor(self.root,self.blog,self.env,**kwargs) if simulated else x.Executor(self.root,self.blog,'1.2.3',**kwargs)
        obj.directory.mkdir(parents=True,exist_ok=True)
        with patch.object(x,'remote_refs',return_value={}):obj.load()
        return obj

    def external(self, fail_linux=False):
        stack=contextlib.ExitStack()
        def refs(root,remote,*names):
            if any(n.startswith('refs/tags/') for n in names):
                return {'refs/tags/v1.2.3':self.env['tag'],'refs/tags/v1.2.3^{}':self.env['tagCommit']} if self.env.get('tag') else {}
            return {'refs/heads/main':self.env[remote]}
        stack.enter_context(patch.object(x,'remote_refs',side_effect=refs))
        stack.enter_context(patch.object(x,'normal_push',side_effect=lambda root,remote,commit,branch:{'commit':commit} if self.env[remote]==commit else None))
        def wait(root,repo,sha,workflow,timeout,ref=None):
            if fail_linux and workflow.endswith('verify.yml'):raise RuntimeError('CI failed at mock-run')
            return {'url':'https://example.invalid/run','commit':sha}
        stack.enter_context(patch.object(x,'wait_workflow',side_effect=wait))
        stack.enter_context(patch.object(x.r,'linux_evidence',side_effect=lambda root,sha:{'commit':sha,'run':'mock-linux-success'}))
        stack.enter_context(patch.object(x.r,'api',side_effect=lambda path,root:{'commit':{'sha':'snapshot','commit':{'message':'Deploy '+git(self.blog,'rev-parse','HEAD')}}}))
        stack.enter_context(patch.object(x.r,'deployed',return_value={'allProductionBytesMatchSnapshot':True}))
        stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
        return stack

    def test_fixture_tag_version_guard_still_rejects_a_mismatched_tag(self):
        for tag, expected in [('v1.2.2', 0), ('v9.9.9', 1)]:
            result = subprocess.run(['node', 'scripts/sync-editor-version.mjs', '--check'],
                                    cwd=self.root, capture_output=True, text=True,
                                    env={**os.environ, 'GITHUB_REF_TYPE': 'tag', 'GITHUB_REF_NAME': tag})
            self.assertEqual(result.returncode, expected, result.stderr)
            if expected:
                self.assertIn('Release tag v9.9.9 does not match Garden v1.2.2', result.stderr)

    def test_real_version_commit_and_resume_without_duplicate_commit(self):
        obj=self.runner();base=git(self.root,'rev-parse','HEAD')
        obj.mutation('version',obj.version_probe,obj.version_action);head=git(self.root,'rev-parse','HEAD')
        self.assertNotEqual(base,head);self.assertEqual(git(self.root,'rev-parse','HEAD^'),base)
        self.assertLessEqual(x.changed_files(self.root,base,head),set(x.VERSION_FILES))
        again=self.runner()
        with patch.object(again,'version_action') as action:again.mutation('version',again.version_probe,again.version_action);action.assert_not_called()
        self.assertEqual((self.blog/'note.md').read_text(),'PRIVATE USER DRAFT')

    def test_partial_version_write_requires_explicit_retry_and_preserves_edits(self):
        obj=self.runner()
        def crash():
            x.write_bytes(self.root/'package.json',(obj.directory/'version-plan/package.json').read_bytes());raise KeyboardInterrupt()
        with self.assertRaises(KeyboardInterrupt):obj.mutation('version',obj.version_probe,crash)
        with self.assertRaisesRegex(RuntimeError,'retry-stage'):obj.mutation('version',obj.version_probe,obj.version_action)
        obj.retry='version';obj.mutation('version',obj.version_probe,obj.version_action)
        self.assertEqual(json.loads((self.root/'editors/typora/manifest.json').read_text())['version'],'1.2.3')
        self.assertEqual((self.blog/'note.md').read_text(),'PRIVATE USER DRAFT')

    def test_user_version_file_edit_is_not_overwritten(self):
        obj=self.runner();p=self.root/'package.json';d=json.loads(p.read_text());d['user']='newest';p.write_text(json.dumps(d))
        with self.assertRaisesRegex(RuntimeError,'User edited'):obj.mutation('version',obj.version_probe,obj.version_action)
        self.assertEqual(json.loads(p.read_text())['user'],'newest')

    def test_full_execution_and_completed_resume_make_no_duplicate_mutations(self):
        obj=self.runner(True)
        with self.external():result=obj.execute()
        mutations=list(self.env['commands']);self.assertEqual(obj.state['current'],'complete')
        self.assertEqual(git(self.root,'rev-parse','refs/tags/v1.2.3^{}'),result['sourceCommit'])
        self.assertLessEqual(x.changed_files(self.blog,obj.state['blogBase'],result['blogCommit']),{'package.json','package-lock.json'})
        self.assertEqual((self.blog/'note.md').read_text(),'PRIVATE USER DRAFT')
        again=self.runner(True)
        with self.external(),patch.object(x.r,'registry',return_value={'version':'1.2.3','gitHead':result['sourceCommit']}):again.execute()
        self.assertEqual(mutations,self.env['commands'])
        self.assertFalse(any('--force' in args or '--no-verify' in args for _,args in mutations))

    def test_transport_error_after_push_reconciles_real_remote_before_resume(self):
        obj=self.runner(True);self.env['disconnect']=True
        with self.external():
            with self.assertRaises(ConnectionError):obj.execute()
        self.assertEqual(obj.state['stages']['source-push']['status'],'uncertain')
        again=self.runner(True)
        with self.external():again.execute()
        pushes=[args for name,args in self.env['commands'] if name=='source-push']
        self.assertEqual(len(pushes),1)

    def test_failed_linux_ci_never_creates_or_pushes_tag(self):
        obj=self.runner(True)
        with self.external(fail_linux=True):
            with self.assertRaisesRegex(RuntimeError,'CI failed'):obj.execute()
        self.assertFalse(git(self.root,'tag','--list','v1.2.3'))
        self.assertFalse(any(name in ('tag-create','tag-push') for name,_ in self.env['commands']))
        self.assertEqual(obj.state['stages']['linux']['status'],'failed')

    def test_uncertain_absent_mutation_is_not_automatically_retried(self):
        obj=self.runner();probe=lambda:None
        with self.assertRaises(ConnectionError):obj.mutation('source-push',probe,lambda:(_ for _ in ()).throw(ConnectionError('offline')))
        with patch.object(obj,'cmd') as command:
            with self.assertRaisesRegex(RuntimeError,'retry-stage'):obj.mutation('source-push',probe,lambda:obj.cmd(['git','push']))
            command.assert_not_called()

    def test_new_session_rejects_already_published_version_before_version_changes(self):
        obj=x.Executor(self.root,self.blog,'1.2.3');obj.directory.mkdir(parents=True)
        with patch.object(x.r,'registry',return_value={'version':'1.2.3'}):
            with self.assertRaisesRegex(RuntimeError,'already published'):obj.load()
        self.assertEqual(json.loads((self.root/'package.json').read_text())['version'],'1.2.2')

    def test_user_staged_article_cannot_enter_automatic_blog_commit(self):
        obj=self.runner();git(self.blog,'add','note.md')
        with self.assertRaisesRegex(RuntimeError,'User files staged'):obj.index_guard(self.blog,['package.json','package-lock.json'],{})
        self.assertEqual(git(self.blog,'diff','--cached','--name-only'),'note.md')

    def test_nonfastforward_is_rejected_without_push(self):
        with patch.object(x,'remote_refs',return_value={'refs/heads/main':'other'}),patch.object(x.r,'git',return_value=''),patch.object(x.r,'command',side_effect=subprocess.CalledProcessError(1,['git','merge-base'])) as cmd:
            with self.assertRaises(subprocess.CalledProcessError):x.normal_push(self.root,'upstream','target','main')
            self.assertFalse(any('push' in call.args[0] for call in cmd.call_args_list))

    def test_ci_wait_reads_real_conclusion_and_stops_on_failure(self):
        run={'id':1,'path':'.github/workflows/verify.yml','head_sha':'sha','head_branch':'main','html_url':'mock','status':'completed','conclusion':'failure'}
        with patch.object(x.r,'api',return_value={'workflow_runs':[run]}),patch.object(x.time,'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError,'CI failed'):x.wait_workflow(self.root,x.r.ENGINE,'sha',run['path'],1,'main')
            sleep.assert_not_called()

    def test_running_ci_uses_one_watch_then_verifies_real_conclusion(self):
        run={'id':1,'path':'.github/workflows/verify.yml','head_sha':'sha','head_branch':'main','html_url':'mock','status':'in_progress','conclusion':None}
        done={**run,'status':'completed','conclusion':'success'}
        with patch.object(x.r,'api',side_effect=[{'workflow_runs':[run]},done]),patch.object(x.subprocess,'run',return_value=subprocess.CompletedProcess([],0)) as watch:
            result=x.wait_workflow(self.root,x.r.ENGINE,'sha',run['path'],60,'main')
            self.assertEqual(result['commit'],'sha');self.assertEqual(watch.call_count,1);self.assertEqual(watch.call_args.args[0][1:3],['run','watch'])

    def test_default_execution_plan_never_mutates_or_queries_registry(self):
        class Args:version='1.2.3';run=False;confirm=None;session='default';retry_stage=None;wait_seconds=1
        with patch.object(x.Executor,'execute') as execute,patch.object(x.r,'registry') as registry:
            result=x.entry(self.root,self.blog,Args());self.assertTrue(result['dryRun']);execute.assert_not_called();registry.assert_not_called()
        self.assertFalse((self.root/'.garden').exists())

    def test_execution_sessions_share_one_kernel_lock(self):
        import fcntl
        obj=self.runner();path=self.root/'.garden/release-executor/lock'
        with path.open('w') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):obj.execute()

    def test_user_new_draft_blocks_execution_without_modification(self):
        obj=self.runner();(self.blog/'new.md').write_text('new user draft')
        with self.assertRaisesRegex(RuntimeError,'Protected files changed'):obj.protect()
        self.assertEqual((self.blog/'new.md').read_text(),'new user draft')

    def test_execution_requires_exact_current_authorization_phrase(self):
        class Args:version='1.2.3';run=True;confirm=None;session='default';retry_stage=None;wait_seconds=1
        with patch.object(x.Executor,'execute') as execute:
            with self.assertRaisesRegex(RuntimeError,'approval'):x.entry(self.root,self.blog,Args())
            execute.assert_not_called()


if __name__=='__main__':unittest.main()
