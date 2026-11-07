import {parseGardenBlock} from '../garden/parse.mjs';
import {compileUiBlock} from '../core/compile.mjs';
import {renderStatic} from '../core/static.mjs';
import {renderCompose} from './render.mjs';
export function previewCompose(body,{info='garden compose',...options}={}){
 const block=parseGardenBlock(info,body);
 if(!block||block.error)return {block:null,payload:null,diagnostics:[{code:block?.error?.code??'compose-invalid',message:block?.error?.message??'Invalid Compose',line:1,severity:'error'}],html:''};
 if(block.mode==='play'){
  const {payload,check}=compileUiBlock(block.uiSource??'',options);
  return {block:payload?{...block,payload}:null,payload,diagnostics:check.diagnostics,html:payload?renderStatic(payload,'html'):''};
 }
 return {block:null,payload:null,diagnostics:[],html:renderCompose(block.props)};
}
