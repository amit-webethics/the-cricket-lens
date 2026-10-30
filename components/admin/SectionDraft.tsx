'use client';
import {useRef,useState} from 'react';
import {api} from './AdminShell';
type Context={articleId?:string;title:string;description:string;heading:string;currentText:string;otherHeadings:string[]};
export default function SectionDraft({context,disabled,onApply}:{context:Context;disabled:boolean;onApply:(text:string)=>void}){
 const[notes,setNotes]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const[suggestion,setSuggestion]=useState<{draft:string;factsToCheck:string[];snapshot:string}|null>(null);
 const request=useRef(false);const snapshot=JSON.stringify({...context,notes});
 async function generate(){if(request.current)return;request.current=true;setBusy(true);setError('');setSuggestion(null);const started=snapshot;
  try{const result=await api('draft-section',{method:'POST',body:started});setSuggestion({...result,snapshot:started});}catch(e:any){setError(e.message);}finally{request.current=false;setBusy(false);}}
 const stale=suggestion&&suggestion.snapshot!==snapshot;
 return <div className="admin-fields"><label>Facts or instructions for this section<textarea rows={3} maxLength={8000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add verified facts and the angle you want to explore. Imported source summaries are included automatically for saved articles."/></label>
 <button type="button" className="admin-secondary" disabled={disabled||busy||!context.title.trim()||!context.heading.trim()} onClick={generate}>{busy?'Generating…':'Generate draft'}</button>
 <small>Uses the available source summaries and your notes. Review the suggestion before using it.</small>
 {error&&<p className="admin-alert error" role="alert">{error}</p>}
 {suggestion&&<div className="admin-fields"><label>Generated suggestion<textarea rows={7} value={suggestion.draft} onChange={e=>setSuggestion({...suggestion,draft:e.target.value})}/></label>
 {suggestion.factsToCheck.length>0&&<div><b>Check before publishing</b><ul>{suggestion.factsToCheck.map((fact,i)=><li key={i}>{fact}</li>)}</ul></div>}
 {stale&&<p role="status">This section or its context has changed. Generate a fresh suggestion.</p>}
 <button type="button" className="admin-secondary" disabled={!!stale||busy||!suggestion.draft.trim()} onClick={()=>{onApply(suggestion.draft.trim().replace(/\s*\n\s*/g,' '));setSuggestion(null);}}>Use draft in this section</button>
 <button type="button" className="admin-quiet" onClick={()=>setSuggestion(null)}>Discard suggestion</button></div>}
 </div>;
}
