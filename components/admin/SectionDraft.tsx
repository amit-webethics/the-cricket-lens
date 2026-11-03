'use client';
import {useEffect,useRef,useState} from 'react';
import type {SourceReference} from '../../lib/cms/source-reference';
import {api} from './AdminShell';
type Context={kind?:'articles'|'news';sourceContent?:SourceReference[];articleId?:string;title:string;description:string;heading:string;currentText:string;otherHeadings:string[]};
export default function SectionDraft({context,disabled,onApply}:{context:Context;disabled:boolean;onApply:(text:string)=>void}){
 const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[checks,setChecks]=useState<string[]>([]);
 const[undo,setUndo]=useState<{before:string;after:string}|null>(null);
 const request=useRef(false);const alive=useRef(true);const snapshot=JSON.stringify(context);const latest=useRef({snapshot,onApply});
 useEffect(()=>{latest.current={snapshot,onApply};},[snapshot,onApply]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function regenerate(){if(request.current)return;request.current=true;setBusy(true);setError('');setChecks([]);const started=snapshot;const before=context.currentText;
  try{const result=await api('draft-section',{method:'POST',body:JSON.stringify({...context,sourceContent:context.sourceContent?.map(ref=>({...ref,sections:[]})),notes:'',mode:before.trim()?'regenerate':'generate'})});
   if(!alive.current)return;
   if(latest.current.snapshot!==started){setError('Your text changed while AI was working. Click Regenerate again to update the latest text.');return;}
   const text=String(result.draft||'').trim().replace(/\s*\n\s*/g,' ');if(!text)throw new Error('AI returned no text. Your existing content is unchanged.');
   latest.current.onApply(text);setUndo({before,after:text});setChecks(Array.isArray(result.factsToCheck)?result.factsToCheck:[]);
  }catch(e:any){if(alive.current)setError(e.message);}finally{request.current=false;if(alive.current)setBusy(false);}
 }
 return <div className="admin-fields"><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" className="admin-secondary" disabled={disabled||busy||!context.title.trim()||!context.heading.trim()} onClick={regenerate}>{busy?'Regenerating…':context.currentText.trim()?'Regenerate with AI':'Generate draft'}</button>
 {undo&&<button type="button" className="admin-quiet" disabled={disabled||busy||context.currentText!==undo.after} onClick={()=>{onApply(undo.before);setUndo(null);setChecks([]);}}>Undo AI update</button>}</div>
 {error&&<p className="admin-alert error" role="alert">{error}</p>}
 {checks.length>0&&<details><summary>Facts to check before publishing</summary><ul>{checks.map((fact,i)=><li key={i}>{fact}</li>)}</ul></details>}
 </div>;
}
