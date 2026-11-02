'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from './AdminShell';
import type {SourceReference} from '../../lib/cms/source-reference';
export default function SourceContent({sources,value,disabled,onChange,onAddSections}:{sources:{label:string;url:string}[];value:SourceReference[];disabled:boolean;onChange:(refs:SourceReference[])=>void;onAddSections?:(headings:string[])=>void}){
 const[selected,setSelected]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');const pending=useRef(false);const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const options=[...new Map(sources.filter(s=>s.url).map(s=>[s.url,s])).values()];
 const url=options.some(s=>s.url===selected)?selected:options[0]?.url||'';
 async function fetchContent(){if(pending.current)return;pending.current=true;setBusy(true);setError('');
  try{const r=await api('source-content',{method:'POST',body:JSON.stringify({url})});if(!alive.current)return;const refs=[...value.filter(s=>s.url!==r.source.url),r.source];if(refs.length>5||refs.reduce((n,s)=>n+s.text.length,0)>200000)throw new Error('Remove a fetched source before adding more. You can keep up to five sources and 200,000 characters.');onChange(refs);}catch(e:any){setError(e.message);}finally{pending.current=false;setBusy(false);}}
 return <section className="admin-panel admin-form-panel"><div className="admin-panel-heading"><h2>Source content</h2><span className="admin-help">Private reference material</span></div><div className="admin-fields">
 <label>Source URL<select value={url} disabled={busy||disabled||!options.length} onChange={e=>setSelected(e.target.value)}>{!options.length&&<option value="">Add a source URL in the editor first</option>}{options.map(s=><option key={s.url} value={s.url}>{s.label||s.url} — {s.url}</option>)}</select></label>
 <button type="button" className="admin-secondary" disabled={busy||disabled||!url} onClick={fetchContent}>{busy?'Fetching source…':'Fetch source content'}</button>
 <small>Fetches accessible article text from ESPNcricinfo or Cricbuzz. Save the item to keep the reference text for later AI regeneration.</small>
 {error&&<div className="admin-alert error" role="alert">{error}</div>}
 {value.map(ref=><details key={ref.url} open><summary>{ref.publisher}: {ref.title||'Source article'} · {ref.text.length.toLocaleString()} characters</summary><div className="admin-fields"><a href={ref.url} target="_blank" rel="noreferrer">Open original source ↗</a><small>Fetched {new Date(ref.fetchedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</small><textarea aria-label={`Fetched content from ${ref.publisher}`} readOnly rows={12} value={ref.text}/><small>{ref.warning}</small>
 {onAddSections&&<button type="button" className="admin-secondary" disabled={busy||disabled} onClick={()=>onAddSections(ref.sections.map(s=>s.heading))}>Add section headings to article</button>}
 <button type="button" className="admin-quiet" disabled={busy||disabled} onClick={()=>onChange(value.filter(s=>s.url!==ref.url))}>Remove fetched reference</button></div></details>)}
 </div></section>;
}
