import fs from 'node:fs';
import path from 'node:path';
const engine = path.resolve(import.meta.dirname, '..');

// The same ordinary author fence format used by a site, not a renderer shortcut.
export function writeRenderingFixture(site) {
  fs.mkdirSync(path.join(site, 'content/posts'), { recursive: true });
  fs.writeFileSync(path.join(site, 'site.config.yaml'), fs.readFileSync(path.join(engine, 'templates/site/site.config.en.yaml'), 'utf8').replace(/^name:.*$/m, 'name: Neutral rendering regression with a deliberately long site name'));
  const fence = source => '```garden compose\n' + source + '\n```';
  const html = '<p>Sandbox navigation fixture</p><button id="run">Run fixture</button>';
  const js = `const button=document.getElementById('run');button.addEventListener('click',()=>{button.textContent='Clicked';parent.postMessage({source:'navigation-fixture',type:'clicked',text:button.textContent},'*')});addEventListener('message',e=>{if(e.data?.source==='navigation-driver'&&e.data.type==='click')button.click()});parent.postMessage({source:'navigation-fixture',type:'ready',text:document.body.textContent},'*');`;
  const connector = fs.readFileSync(path.join(engine, '.agents/skills/garden-compose/references/measured-connectors.js'), 'utf8');
  const graphHtml = '<div class="tools"><button id="type">Enlarge labels</button><button id="move">Move label</button><button id="width">Resize container</button></div><section id="graph"><div data-node="a"><p>Neutral source node with natural wrapping.</p></div><div data-node="b"><p>Neutral second node.</p></div><div data-node="c"><p>Neutral final node with a longer explanation.</p></div></section><p>Straight A–B; elbow A–C; dashed elbow B–C. Measured endpoints, not automatic obstacle routing.</p>';
  const graphCss = '*{box-sizing:border-box}body{line-height:1.6}.tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}button{font:inherit;min-height:40px}#graph{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}#graph>[data-node]{border:1px solid var(--rule);padding:12px;min-width:0}[data-node="a"]{grid-row:span 2;align-self:center}#graph p{margin:0;font:inherit;overflow-wrap:anywhere}';
  const graphJs = `${connector}\nconst root=document.getElementById('graph');mountMeasuredConnectors(root,[{from:'a',to:'b'},{from:'a',to:'c',route:'elbow'},{from:'b',to:'c',route:'elbow',dashed:true}]);document.getElementById('type').onclick=()=>{root.style.fontSize=root.style.fontSize?'':'21px'};document.getElementById('move').onclick=()=>{const node=root.querySelector('[data-node="b"]');node.style.transform=node.style.transform?'':'translateY(8px)'};document.getElementById('width').onclick=()=>{root.style.width=root.style.width?'':'75%'};`;
  const source = [
    '---\ntitle: Neutral rendering fixture\ndate: 2026-01-01\nsummary: Explicitly neutral automated rendering test.\ntags: [test]\n---',
    'Every number, label and sentence below is explicit test material, not a user article.',
    '## Native header',
    fence('<figure frame="none"><card><row align="center" justify="between" wrap="nowrap"><title align="start">Neutral card title</title><badge>Weekly</badge></row><text>Neutral test content, not a user article.</text></card></figure>'),
    '## Sandbox lifecycle',
    fence(`caption: Neutral sandbox lifecycle assertion\n---\n<sandbox title="Navigation fixture" html={${JSON.stringify(html)}} js={${JSON.stringify(js)}}/>`),
    '## Default transparency and explicit fills',
    fence('<figure><grid cols={2} gap={3}><card border="strong"><title>Transparent card</title><text>Default transparent fill and explicit border are independent.</text></card><card border="subtle" backgroundColor="#e6efff"><title>Explicit blue fill</title><text>This deliberately chosen fill must remain visible.</text></card></grid></figure>'),
    '## Metrics and nesting',
    fence('<figure frame="none"><grid cols={3} gap={3}><card><metric label="Test count" value="12" caption="Neutral fixture value"/></card><card><metric label="Test share" value="40" unit="%" caption="Neutral fixture value"/></card><card><stack gap={3}><title>Nested group</title><card background="surface"><text>Nested readable body, without smaller type or a fixed height.</text></card></stack></card></grid></figure>'),
    '## Proportions',
    fence('caption: Test proportions retain their labels and exact data.\n---\n<pie title="Neutral proportions" slices={[{label:"Test A",value:2},{label:"Test B",value:3},{label:"Test C",value:5}]} />'),
    '## Measured connectors',
    fence(`caption: Labels stay in DOM while connector endpoints follow actual node bounds.\n---\n<sandbox title="Measured connector fixture" html={${JSON.stringify(graphHtml)}} css={${JSON.stringify(graphCss)}} js={${JSON.stringify(graphJs)}}/>`),
  ].join('\n\n') + '\n';
  const post = path.join(site, 'content/posts/rendering-fixture.md');
  fs.writeFileSync(post, source);
  return post;
}
