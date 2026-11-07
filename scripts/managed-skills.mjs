import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(root, prefix = '') {
  if (!fs.existsSync(root)) return {};
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error(`Managed kit cannot be a symlink: ${root}`);
  return Object.fromEntries(fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(entry=>{
    const relative=path.join(prefix,entry.name),full=path.join(root,relative);
    if(entry.isSymbolicLink()) throw new Error(`Managed kit cannot contain symlinks: ${full}`);
    return entry.isDirectory()?Object.entries(inventory(root,relative)):[[relative,fs.readFileSync(full)]];
  }));
}
/** Generic managed tree sync; backup locally modified or preexisting unknown files before replacing. */
export function syncManagedTree({ destination, files, previous = {}, backup }) {
  const current=inventory(destination),next={};
  for(const relative of [...Object.keys(files),...Object.keys(previous)])if(path.isAbsolute(relative)||relative.split(/[\\/]/u).includes('..'))throw new Error('Invalid managed path');
  for(const [relative,bytes] of Object.entries(files)) {
    if(path.isAbsolute(relative)||relative.split(/[\\/]/u).includes('..'))throw new Error('Invalid managed path');
    const target=path.join(destination,relative),old=current[relative];
    if(old && !old.equals(bytes) && hash(old)!==previous[relative]) backup(relative,old);
    if(!old || !old.equals(bytes)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
    next[relative]=hash(bytes);
  }
  for(const relative of Object.keys(previous)) if(!Object.hasOwn(files,relative)&&current[relative]) {
    if(hash(current[relative])!==previous[relative])backup(relative,current[relative]);
    fs.unlinkSync(path.join(destination,relative));
  }
  return next;
}
/** Read-only language overlay: English entry point inherits shared references/scripts. */
export function managedSkillBundle({ engineRoot, name, lang = 'zh' }) {
  const files=inventory(path.join(engineRoot,'.agents/skills',name));
  if(!files['SKILL.md'])throw new Error(`Missing ${name}/SKILL.md; no skills changed.`);
  if(lang==='en')Object.assign(files,inventory(path.join(engineRoot,'templates/skills-en',name)));
  return files;
}
export function installManagedSkills({ engineRoot, siteRoot, lang = 'zh', log = console.log }) {
  const source=path.join(engineRoot,'.agents/skills');
  // Do not retire anything until the complete replacement entry point exists.
  if(!fs.existsSync(path.join(source,'garden-compose/SKILL.md')))throw new Error('Replacement garden-compose kit is missing; no skills changed.');
  const names=['garden-compose','garden-post-review'];
  const bundles=Object.fromEntries(names.map(name=>[name,managedSkillBundle({engineRoot,name,lang})]));
  const statePath=path.join(siteRoot,'.garden/managed-skills.json');
  let state={};try{state=JSON.parse(fs.readFileSync(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const stamp=new Date().toISOString().replace(/[:.]/gu,'-')+'-'+process.pid;
  const backupRoot=path.join(siteRoot,'.garden/skill-backups',stamp);
  const backup=(relative,bytes)=>{const file=path.join(backupRoot,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
  const targetRoot=path.join(siteRoot,'.agents/skills');
  for(const name of [...names,'garden-ui','garden-interactive-chart'])inventory(path.join(targetRoot,name));
  // Retired skills are backed up in full, including locally authored extra files.
  for(const name of ['garden-ui','garden-interactive-chart']) {
    const dir=path.join(targetRoot,name);
    for(const [relative,bytes] of Object.entries(inventory(dir)))backup(path.join(name,relative),bytes);
    if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true});
  }
  const next={};
  for(const name of names)next[name]=syncManagedTree({destination:path.join(targetRoot,name),files:bundles[name],previous:state[name]??{},backup:(relative,bytes)=>backup(path.join(name,relative),bytes)});
  fs.mkdirSync(path.dirname(statePath),{recursive:true});const tmp=statePath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n');fs.renameSync(tmp,statePath);
  if(fs.existsSync(backupRoot))log(`Preserved previous/local skill files: ${backupRoot}`);
  return names;
}
