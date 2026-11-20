'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from './AdminShell';
import type {SourceReference} from '../../lib/cms/source-reference';
import type {RewrittenSourceSection} from '../../lib/cms/editor-source';
export default function SourceContent({kind,sources,disabled,onFetch,contentSnapshot,onUndo,canUndo}:{kind:'articles'|'news';sources:{label:string;url:string}[];disabled:boolean;onFetch:(source:SourceReference,sections:RewrittenSourceSection[])=>void;contentSnapshot:string;onUndo?:()=>void;canUndo?:boolean}){
 const [factsToCheck,setFactsToCheck]=useState<string[]>([]);
 const[selected,setSelected]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');const pending=useRef(false);const alive=useRef(true);const latest=useRef({contentSnapshot,onFetch});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{latest.current={contentSnapshot,onFetch};},[contentSnapshot,onFetch]);
 const options=[...new Map(sources.filter(s=>s.url).map(s=>[s.url,s])).values()];
 const url=options.some(s=>s.url===selected)?selected:options[0]?.url||'';
 async function fetchContent(){if(pending.current)return;pending.current=true;setBusy(true);setError('');setFactsToCheck([]);const started=contentSnapshot;
  try{
   const {source}=await api('source-content',{method:'POST',body:JSON.stringify({url})});
   if(!alive.current)return;
   const draft=await api('rewrite-source',{method:'POST',body:JSON.stringify({kind,source:{title:source.title,publisher:source.publisher,text:source.text}})});
   if(!alive.current)return;
   if(latest.current.contentSnapshot!==started){
    setError('Your text changed during the rewrite. Click Fetch content to try again.');
    return;
   }
   latest.current.onFetch(source,draft.sections);
   setFactsToCheck(draft.factsToCheck);
  }catch(e:any){if(alive.current)setError(e.message);}finally{pending.current=false;if(alive.current)setBusy(false);}}
 return <section className="admin-panel admin-form-panel admin-source-fetch"><div className="admin-panel-heading"><h2>Fetch content from source</h2></div><div className="admin-fields"><label>Source URL<select value={url} disabled={busy||disabled||!options.length} onChange={e=>setSelected(e.target.value)}>{!options.length&&<option value="">Add a source URL in the editor first</option>}{options.map(s=><option key={s.url} value={s.url}>{s.label||s.url} — {s.url}</option>)}</select></label>
 <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" className="admin-secondary" disabled={busy||disabled||!url} onClick={fetchContent}>{busy?'Fetching and rewriting…':'Fetch content'}</button>{onUndo&&<button type="button" className="admin-quiet" disabled={busy||disabled||!canUndo} onClick={()=>{onUndo();setFactsToCheck([]);}}>Undo fetch</button>}</div>
 <small>Rewrites the selected source into editable sections with descriptive headings. Review the draft and verify the facts before publishing.</small>
 {factsToCheck.length>0&&<div><strong>Facts to check</strong><ul>{factsToCheck.map((fact,index)=><li key={index}>{fact}</li>)}</ul></div>}
 {error&&<div className="admin-alert error" role="alert">{error}</div>}
 </div></section>;
}
