import { hasIcon } from "./icons.mjs";
/** Native Compose semantic components. Rendering reuses the existing feature implementations. */
import { articleUrl, renderArticleContent } from '../garden/article-content.mjs';
import { readFileProps } from '../garden/file-block.mjs';
import { relationIndex } from '../garden/relations.mjs';
export const FEATURE_TAGS = new Set(['resource','metric','timeline','relations','choices','files','file','plot','icon-list']);
export const FEATURE_PARTS = new Set(['point','event','entity','edge','choice-option','entry','datum']);
const fields = {
 resource:['href','title','description','image','alt','meta','source','takeaway'],
 metric:['label','value','unit','caption','source','text'],
 timeline:['title'],event:['date','title','source','text'],
 relations:['title','center','caption'],entity:['id','title','text'],edge:['from','to','style','direction','label'],
 choices:['title','caption'], 'choice-option':['icon','value','text','label','reply','none'],
 files:['title'],file:['src','title','note','resolved'],
 plot:['type','title','unit','caption','xLabel','yLabel'],datum:['x','y','label'],
 'icon-list':['title','caption'],entry:['icon','title','text'],point:['title','text'],
};
const paragraph = nodes => nodes.filter(n=>n.type==='text').map(n=>n.text);
const texts = nodes => paragraph(nodes).join('\n\n');
export function featurePart(name,attrs,children=[]) {
 return {type:'feature-part',tag:name,attrs,children};
}
export function compileFeature(name,attrs,children,fail) {
 const allowed=fields[name]??[];
 for(const key of Object.keys(attrs))if(!allowed.includes(key))fail(`<${name}> 不支持属性 ${key}；可用：${allowed.join(', ')}。`);
 for(const key of ['href','image','source','src'])if(attrs[key])articleUrl(attrs[key],key==='image');
 for(const key of ['title','description','caption','text','meta','takeaway','label','reply'])if(attrs[key])renderArticleContent(attrs[key],{inline:true});
 if(attrs.icon && !hasIcon(String(attrs.icon)))fail(`<${name}> 不认识 Compose 图标 ${attrs.icon}；请查当前图标目录。`);
 const parts=children.filter(n=>n.type==='feature-part');
 const expect=(...tags)=>{const bad=children.find(n=>n.type!=='feature-part'||!tags.includes(n.tag));if(bad)fail(`<${name}> 的直接子项只能是 ${tags.map(t=>'<'+t+'>').join(', ')}。`);};
 const records=tag=>parts.filter(n=>n.tag===tag).map(n=>{
  compileFeature(n.tag,n.attrs,n.children,fail);
  return {...n.attrs,...(n.children.length?{text:texts(n.children)}:{})};
 });
 let legacy,props;
 switch(name){
  case 'point':case 'event':case 'entity':case 'choice-option':case 'entry':
   if(children.some(n=>n.type!=='text'))fail(`<${name}> 的正文请使用一个或多个 <text>；复杂块放到相邻的 <markdown> 中。`);
   return null;
  case 'edge':case 'datum':return null;
  case 'resource':
   if(children.some(n=>n.type!=='text'&&!(n.type==='feature-part'&&n.tag==='point')))fail('<resource> 只接受 <text> 说明和 <point> 要点。');
   legacy='card';props={...attrs,url:attrs.href??'',description:attrs.description??texts(children),points:records('point')};delete props.href;break;
  case 'metric':legacy='stat';props={...attrs};break;
  case 'timeline':expect('event');legacy='timeline';props={...attrs,items:records('event')};break;
  case 'icon-list':expect('entry');legacy='list';props={...attrs,items:parts.map(n=>{compileFeature(n.tag,n.attrs,n.children,fail);return {...n.attrs,...(n.children.length?{text:paragraph(n.children)}:{})};})};break;
  case 'relations':{
   expect('entity','edge');const entities=records('entity');const links=records('edge');
   if(entities.length<3||entities.length>6)fail('<relations> 需要3–6个 entity；更多要素请拆分。');
   const ids=entities.map((e,i)=>String(e.id??e.title??i+1));if(new Set(ids).size!==ids.length)fail('<relations> entity id/title 必须唯一。');
   const index=value=>{const exact=ids.indexOf(String(value));return exact>=0?exact:relationIndex(value,entities.map(e=>String(e.title??'')));};
   const mapped=links.map(edge=>{const from=index(edge.from),to=index(edge.to);if(from<0||to<0||from===to)fail('<edge> from/to 必须引用不同的现有 entity id、标题或1起序号。');if(edge.style&&!['solid','dashed'].includes(edge.style))fail('<edge> style 只能是 solid/dashed。');if(edge.direction&&!['one','both'].includes(edge.direction))fail('<edge> direction 只能是 one/both。');return {...edge,from:from+1,to:to+1};});
   legacy='relations';props={...attrs,items:entities.map(({id,...e})=>e),links:mapped};if(attrs.center){const center=index(attrs.center);if(center<0)fail('<relations> center 必须引用现有 entity。');props.center=center+1;}break;
  }
  case 'choices':{
   expect('choice-option');const options=records('choice-option');const none=options.filter(o=>o.none===true||o.none==='true');if(none.length>1)fail('<choices> 至多一个 none 选项。');
   const items=options.filter(o=>!none.includes(o));if(items.length<1)fail('<choices> 至少需要一个普通选项。');
   legacy='choice';props={...attrs,items:items.map(({none,...o})=>o),...(none.length?{none:((({none,...o})=>o)(none[0]))}:{})};break;
  }
  case 'file':{
   legacy='file';props={...attrs};if(attrs.resolved){try{props={resolved:JSON.parse(decodeURIComponent(attrs.resolved))};}catch{fail('<file> 内部 resolved 无效；作者只应填写 src。');}}
   else {const read=readFileProps(props);if(read.errors.length)fail(read.errors.join('；'));}break;
  }
  case 'files':{
   if(children.some(n=>n.type!=='feature'||n.name!=='file'))fail('<files> 只能包含 <file/>。');
   legacy='file';props={...attrs,files:children.map(n=>n.props)};break;
  }
  case 'plot':{
   expect('datum');if(attrs.type&&attrs.type!=='bar')fail('<plot> 是已有离散条形图；曲线/饼图使用 Compose 的 <chart>/<pie>。');
   const data=records('datum').map(row=>{const y=Number(row.y);if(!Number.isFinite(y))fail('<datum> y 必须是有限数字。');return {...row,y};});if(!data.length)fail('<plot> 至少需要一个 datum。');legacy='chart';props={...attrs,type:'bar',data};break;
  }
  default:return null;
 }
 return {type:'feature',name:legacy,props,tag:name};
}
