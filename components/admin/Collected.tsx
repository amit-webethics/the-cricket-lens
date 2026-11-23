'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from './AdminShell';
import {Entry} from '../../lib/cms/schema';
const storyTypes = [
 {value:'all',label:'All'},
 {value:'articles',label:'Blogs'},
 {value:'news',label:'News'},
 {value:'review',label:'Unclassified'},
] as const;

const pendingRunKey='cricket-lens:apify-import';

export default function Collected(){
 const [storyType,setStoryType]=useState('all');
 const router=useRouter();const[items,setItems]=useState<any[]>([]);const[categories,setCategories]=useState<Entry[]>([]);const[authors,setAuthors]=useState<Entry[]>([]);
 const [pendingRun,setPendingRun]=useState('');
 const [watching,setWatching]=useState(false);
 const [progress,setProgress]=useState('');
 const[runId,setRunId]=useState('');const[error,setError]=useState('');const[notice,setNotice]=useState('');const[busy,setBusy]=useState(false);const[loading,setLoading]=useState(true);const[filter,setFilter]=useState('new');const[configured,setConfigured]=useState(false);const[choices,setChoices]=useState<Record<string,{kind:string;categoryId:string;authorId:string}>>({});
 async function load(){const [r,c,a]=await Promise.all([api('collected'),api('categories'),api('authors')]);setItems(r.items);setConfigured(r.configured);setCategories(c.items.filter((x:Entry)=>x.status==='published'));setAuthors(a.items.filter((x:Entry)=>x.status==='published'));}
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{
  const saved=sessionStorage.getItem(pendingRunKey);
  if(saved){setPendingRun(saved);setWatching(true);}
 },[]);

 useEffect(()=>{
  if(!pendingRun||!watching)return;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  const finish=()=>{
   sessionStorage.removeItem(pendingRunKey);
   setPendingRun('');
   setWatching(false);
   setProgress('');
  };
  async function check(){
   try{
    const run=await api(`collected/run/${pendingRun}`,{signal:controller.signal});
    if(controller.signal.aborted)return;
    if(run.active){
     setProgress('Apify is collecting stories…');
     timer=setTimeout(check,5000);
     return;
    }
    if(run.status!=='SUCCEEDED'){
     finish();
     setError(`Apify ended with status ${run.status}. Check the run in Apify and try again.`);
     return;
    }
    setProgress('Importing collected stories…');
    const result=await api('collected/import',{method:'POST',body:JSON.stringify({runId:pendingRun}),signal:controller.signal});
    if(controller.signal.aborted)return;
    setNotice(`${result.inserted} new stories · ${result.duplicates} already collected · ${result.invalid} invalid rows`);
    finish();
    await load();
   }catch(error){
    if(controller.signal.aborted)return;
    setWatching(false);
    setProgress('');
    setError(error instanceof Error?error.message:'Unable to check the import.');
   }
  }
  void check();
  return ()=>{controller.abort();clearTimeout(timer);};
 },[pendingRun,watching]);

 async function collectStories(){
  setError('');
  setNotice('');
  setProgress(pendingRun?'Checking the Apify run…':'Starting Apify…');
  if(pendingRun){setWatching(true);return;}
  setBusy(true);
  try{
   const result=await api('collected/run',{method:'POST'});
   sessionStorage.setItem(pendingRunKey,result.runId);
   setPendingRun(result.runId);
   setWatching(true);
  }catch(error){
   setProgress('');
   setError(error instanceof Error?error.message:'Unable to start Apify.');
  }finally{setBusy(false);}
 }

 function choice(row:any){return choices[row.id]||{kind:row.data.kind,categoryId:categories.find(c=>[row.data.sourceCategory,row.data.category].some(name=>name?.trim().toLowerCase()===c.title.toLowerCase()))?.id||'',authorId:authors.find(a=>a.slug==='the-cricket-lens')?.id||''};}
 function update(row:any,key:string,value:string){setChoices(old=>({...old,[row.id]:{...choice(row),[key]:value}}));}
 async function classify(row:any,kind:string){
  setBusy(true);
  setError('');
  try{
   await api(`collected/${row.id}`,{method:'POST',body:JSON.stringify({action:'classify',kind})});
   setItems(current=>current.map(item=>item.id===row.id?{...item,data:{...item.data,kind,reason:'Manually classified'}}:item));
   update(row,'kind',kind);
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 const visible=items.filter(row=>(filter==='all'||row.state===filter)&&(storyType==='all'||row.data.kind===storyType));

 async function act(row:any,action:'draft'|'dismiss'){
  setBusy(true);setError('');try{const c=choice(row);const r=await api(`collected/${row.id}`,{method:'POST',body:JSON.stringify(action==='dismiss'?{action}:{action,kind:c.kind,categoryId:c.categoryId||undefined,...(c.kind==='articles'?{authorId:c.authorId}:{})})});if(action==='draft')router.push(`/admin/${r.item.kind}/edit/?id=${r.item.id}`);else await load();}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 return <><div className="admin-page-heading"><div><span className="admin-overline">SOURCE DESK</span><h1>Collected stories</h1><p>Review source coverage, choose its destination, then edit and publish.</p></div></div>
 {error&&<div className="admin-alert error" role="alert">{error}</div>}{notice&&<div className="admin-alert success" role="status">{notice}</div>}
 <section className="admin-panel admin-form-panel"><div className="admin-panel-heading"><h2>Import stories</h2></div><div className="admin-fields">
 <button type="button" className="admin-primary" disabled={!configured||busy||watching} onClick={collectStories}>{watching?'Import in progress…':pendingRun?'Resume import':'Run Apify & import stories'}</button>
 {progress&&<p role="status">{progress}</p>}
 {!configured&&<p role="status">Configure the Apify API token and collector Actor ID on the server.</p>}
 </div><details className="admin-fields"><summary>Import an existing run by ID</summary><form className="admin-fields" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setNotice('');try{const r=await api('collected/import',{method:'POST',body:JSON.stringify({runId:runId.trim()})});setNotice(`${r.inserted} new stories · ${r.duplicates} already collected · ${r.invalid} invalid rows`);await load();}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>
 <label><span className="admin-field-label">Apify run ID<span className="admin-required" aria-hidden="true">*</span></span><input required value={runId} onChange={e=>setRunId(e.target.value)} placeholder="Run ID from your completed run"/></label><button className="admin-primary" disabled={busy||watching||!configured}>{busy?'Working…':'Import run'}</button><small>Re-importing preserves existing stories and your edits.</small></form></details></section>
 <div className="admin-list-toolbar"><label>Show <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="new">New stories</option><option value="drafted">Sent to editor</option><option value="dismissed">Dismissed</option><option value="all">All (latest 500)</option></select></label><label>Story type <select value={storyType} onChange={e=>setStoryType(e.target.value)}>{storyTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></label></div>
 {loading?<p>Loading stories…</p>:visible.length===0?<div className="admin-empty">No stories in this view yet.</div>:visible.map(row=>{const d=row.data,c=choice(row);return <section className="admin-panel admin-form-panel" key={row.id}><div className="admin-panel-heading"><h2>{d.title}</h2><span className="admin-status draft">{storyTypes.find(type=>type.value===d.kind)?.label} · {row.state}</span></div><div className="admin-fields"><div><b>Sources ({row.references?.length||1})</b>{(row.references||[d]).map((ref:any)=><p key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.source} ↗</a> · {ref.published||'Source date missing'}<br/><small>{ref.title}</small></p>)}<small>Collected: {new Date(row.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</small></div><p>{d.summary||'No summary supplied. Open the source to review the story.'}</p><small>Source tags: {d.tags||'None'} · {d.reason}. {d.dateCheck}</small>
 {row.possibleDuplicates?.length>0&&<div><b>Possible related coverage — review before merging</b><ul>{row.possibleDuplicates.map((p:any)=><li key={p.id}>{p.title}</li>)}</ul></div>}

 {row.entry_id?<Link className="admin-primary" href={`/admin/${row.entry_kind}/edit/?id=${row.entry_id}`}>Open saved {row.entry_kind==='news'?'news update':'article'}</Link>:row.state==='new'&&<><label>Website section<select value={c.kind} disabled={busy} onChange={e=>classify(row,e.target.value)}><option value="review">Unclassified</option><option value="news">Cricket news — right sidebar</option><option value="articles">Blog article — centre and recent articles</option></select></label>{c.kind!=='review'&&<label>Category<select value={c.categoryId} onChange={e=>update(row,'categoryId',e.target.value)}><option value="">Choose a category</option>{categories.map(cat=><option key={cat.id} value={cat.id}>{cat.title}</option>)}</select></label>}{c.kind==='articles'&&<label>Website author<select value={c.authorId} onChange={e=>update(row,'authorId',e.target.value)}><option value="">Choose an author</option>{authors.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>}
 <p className="admin-help">Open this story in the editor to write and review it. For articles, use Generate draft beside each body section. Publication still requires your verification.</p><button className="admin-primary" disabled={busy||c.kind==='review'||(c.kind==='articles'&&(!c.categoryId||!c.authorId))} onClick={()=>act(row,'draft')}>Open in editor</button><button className="admin-quiet" disabled={busy} onClick={()=>act(row,'dismiss')}>Dismiss story</button></>}
 </div></section>})}</>;
}
