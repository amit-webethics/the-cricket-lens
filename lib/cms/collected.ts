import {createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {database,createContentStore} from './db';
import {slugify} from './schema';
import {classifyStory,suggestDraftMetadata,type StoryKind} from './story-suggestions';
import {coverageMatch} from './story-matching';

export const runIdSchema=z.string().regex(/^[A-Za-z0-9]{10,40}$/,'Enter the Apify run ID, not the full URL');
export function webhookAuthorized(value:string|null){const expected=process.env.APIFY_WEBHOOK_SECRET;if(!expected||expected.length<32||!value)return false;const a=Buffer.from(value),b=Buffer.from(`Bearer ${expected}`);return a.length===b.length&&timingSafeEqual(a,b);}
export function sourceUrl(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw new Error('Invalid source URL');u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','gclid'].includes(key.toLowerCase()))u.searchParams.delete(key);u.searchParams.sort();u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.toString();}
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
export function suggestSection(title:string,tags:string,suggested:string){
 return classifyStory({title,tags,suggestedType:suggested});
}
export function normalizeStory(raw:any,runId:string){
 const title=text(raw?.['Original headline'],220),source=text(raw?.Source,160),url=sourceUrl(text(raw?.['Source URL'],1500));
 if(!title||!source)throw new Error('Missing headline or source');
 const story={
  title,source,url,
  summary:text(raw['Feed summary (source text)'],2000),
  tags:Array.isArray(raw['Source tags'])?text(raw['Source tags'].filter((value:unknown)=>typeof value==='string').join(', '),2000):text(raw['Source tags'],2000),
  suggestedType:text(raw['Suggested type'],100),
  sourceCategory:text(raw['Source category'],160),
 };
 return {id:createHash('sha256').update(url).digest('hex'),...story,published:text(raw['Published UTC'],80),collected:text(raw['Collected UTC'],80),dateCheck:text(raw['Date check'],160),runId,...classifyStory(story)};
}
export function createCollectedStore(sql:ReturnType<typeof database>){
 return {
 async importRows(rows:any[],runId:string){
  let inserted=0,duplicates=0,invalid=0,skipped=0;
  const normalized=[];for(const row of rows){try{
   const story=normalizeStory(row,runId);
   if(!['cricbuzz.com','www.cricbuzz.com'].includes(new URL(story.url).hostname)){skipped++;continue;}
   normalized.push(story);
  }catch{invalid++;}}
  await sql.begin(async tx=>{
   await tx`LOCK TABLE cms_collected IN SHARE ROW EXCLUSIVE MODE`;
   const recent=await tx`SELECT id,data,group_id FROM cms_collected WHERE state<>'dismissed' AND created_at > now()-interval '7 days'`;
   for(const row of normalized){
   const match=recent.find((r:any)=>coverageMatch(row,r.data)==='same');
   const groupId=match?(match.group_id||match.id):row.id;
   const result=await tx`INSERT INTO cms_collected(id,source_url,data,group_id) VALUES(${row.id},${row.url},${tx.json(row)},${groupId}) ON CONFLICT DO NOTHING RETURNING id`;if(result.length){inserted++;recent.push({id:row.id,data:row,group_id:groupId});}else duplicates++;}});
  return {inserted,duplicates,invalid,skipped,total:rows.length};
 },
 async list(){
  const rows=await sql`WITH latest AS (SELECT COALESCE(group_id,id) AS root,max(created_at) AS newest FROM cms_collected GROUP BY COALESCE(group_id,id) ORDER BY newest DESC LIMIT 500) SELECT c.* FROM cms_collected c JOIN latest g ON COALESCE(c.group_id,c.id)=g.root ORDER BY g.newest DESC,c.created_at`;
  const groups=new Map<string,any>();for(const row of rows){const root=row.group_id||row.id;let item=groups.get(root);if(!item){item={...row,id:root,references:[],possibleDuplicates:[]};groups.set(root,item);}item.references.push({...row.data,id:row.id});if(row.entry_id){item.entry_id=row.entry_id;item.entry_kind=row.entry_kind;item.state='drafted';}}
  const items=[...groups.values()];
  for(const item of items){
   const suggestion=classifyStory(item.data);
   const manualKind=item.references.find((reference:any)=>reference.manualKind)?.manualKind;
   const automatic=suggestion.kind==='review'&&item.data.kind!=='review'?item.data:suggestion;
   const kind=item.entry_kind||manualKind||automatic.kind||'review';
   item.data={...item.data,...automatic,kind,reason:manualKind?'Manually classified':automatic.reason};
  }
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){if(coverageMatch(items[i].data,items[j].data)!=='different'){items[i].possibleDuplicates.push({id:items[j].id,title:items[j].data.title});items[j].possibleDuplicates.push({id:items[i].id,title:items[i].data.title});}}
  return items;
 },
 async classify(id:string,kind:StoryKind){
  return sql.begin(async tx=>{
   await tx`LOCK TABLE cms_collected IN SHARE ROW EXCLUSIVE MODE`;
   const members=await tx`SELECT id,entry_id,state FROM cms_collected WHERE COALESCE(group_id,id)=${id}`;
   if(!members.length||members.some(row=>row.entry_id)||!members.some(row=>row.state==='new')){
    throw new Error('Choose a new story to classify');
   }
   await tx`UPDATE cms_collected SET data=jsonb_set(data,'{manualKind}',to_jsonb(${kind}::text)) WHERE COALESCE(group_id,id)=${id}`;
   return {kind};
  });
 },
 async merge(id:string,target:string){return sql.begin(async tx=>{
  await tx`LOCK TABLE cms_collected IN SHARE ROW EXCLUSIVE MODE`;
  const rows=await tx`SELECT * FROM cms_collected WHERE COALESCE(group_id,id) IN (${id},${target})`;
  if(id===target||!rows.some(r=>(r.group_id||r.id)===id)||!rows.some(r=>(r.group_id||r.id)===target))throw new Error('Choose two existing story groups');
  if(rows.filter(r=>r.entry_id).length)throw new Error('Choose stories that have not been sent to the editor');
  const override=rows.find(r=>(r.group_id||r.id)===target&&r.data.manualKind)?.data.manualKind
   ??rows.find(r=>r.data.manualKind)?.data.manualKind;
  await tx`UPDATE cms_collected SET group_id=${target},state='new' WHERE COALESCE(group_id,id)=${id}`;
  if(override)await tx`UPDATE cms_collected SET data=jsonb_set(data,'{manualKind}',to_jsonb(${override}::text)) WHERE COALESCE(group_id,id)=${target}`;
  return {ok:true};
 });},
 async convert(id:string,choice:{kind:'articles'|'news';categoryId?:string;authorId?:string}){
  return sql.begin(async tx=>{
   await tx`LOCK TABLE cms_collected IN SHARE ROW EXCLUSIVE MODE`;
   const members=await tx`SELECT * FROM cms_collected WHERE COALESCE(group_id,id)=${id} OR id=${id} ORDER BY created_at FOR UPDATE`;
   const row=members.find(r=>r.entry_id)||members[0];
   if(!row)throw new Error('Collected story not found');
   if(row.entry_id)return {id:row.entry_id,kind:row.entry_kind};
   const d=row.data;const store=createContentStore(tx as unknown as ReturnType<typeof database>,true);
   const common={...suggestDraftMetadata(d),title:d.title,slug:`${slugify(d.title).slice(0,140)||'cricket'}-${id.slice(0,12)}`,status:'draft',verified:false};
   const value=choice.kind==='news'?{...common,summary:d.summary.slice(0,1200)||d.title,sourceLabel:[...new Set(members.map(r=>r.data.source))].join(' / ').slice(0,160),sourceUrl:d.url,categoryId:choice.categoryId,sources:members.slice(0,30).map(r=>({label:r.data.source,url:r.data.url})),team:''}:{...common,description:d.summary.slice(0,500)||d.title,categoryId:choice.categoryId,authorId:choice.authorId,minutes:1,sections:[{heading:'Story',body:[d.summary||d.title]}],sources:members.slice(0,30).map(r=>({label:r.data.source,url:r.data.url})),series:'',featured:false,imageRightsConfirmed:false};
   const entry=await store.saveEntry(choice.kind,value);
   await tx`UPDATE cms_collected SET state='drafted',entry_id=${entry.id},entry_kind=${choice.kind} WHERE COALESCE(group_id,id)=${id} OR id=${id}`;
   return {id:entry.id,kind:entry.kind};
  });
 },
 async clearNew(){
  return sql.begin(async tx=>{
   await tx`LOCK TABLE cms_collected IN SHARE ROW EXCLUSIVE MODE`;
   const rows=await tx`
    UPDATE cms_collected AS story SET state='dismissed'
    WHERE story.state='new' AND story.entry_id IS NULL AND NOT EXISTS (
     SELECT 1 FROM cms_collected AS linked
     WHERE COALESCE(linked.group_id,linked.id)=COALESCE(story.group_id,story.id)
      AND linked.entry_id IS NOT NULL
    )
    RETURNING COALESCE(story.group_id,story.id) AS group_id
   `;
   return {cleared:new Set(rows.map(row=>row.group_id)).size};
  });
 },
 async dismiss(id:string){return sql`UPDATE cms_collected SET state='dismissed' WHERE (COALESCE(group_id,id)=${id} OR id=${id}) AND entry_id IS NULL RETURNING id`;}
 };
}
const activeStatuses=new Set(['READY','RUNNING','TIMING-OUT','ABORTING']);

function apifyClient(fetcher:typeof fetch=fetch){
 const token=process.env.APIFY_API_TOKEN,actorId=process.env.APIFY_ACTOR_ID;
 if(!token||!actorId)throw new Error('Configure APIFY_API_TOKEN and APIFY_ACTOR_ID on the server');
 async function request(path:string,input?:Record<string,unknown>){
  const response=await fetcher(`https://api.apify.com/v2/${path}`,{
   ...(input?{method:'POST',body:JSON.stringify(input)}:{}),
   headers:{Authorization:`Bearer ${token}`,...(input?{'Content-Type':'application/json'}:{})},
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),
  });
  if(!response.ok)throw new Error(`Apify request failed (${response.status})`);
  return response.json();
 }
 return {actorId,request};
}

function collectorRun(run:any,actorId:string){
 if(run?.actId!==actorId||!runIdSchema.safeParse(run.id).success||typeof run.status!=='string'){
  throw new Error('Apify run does not belong to the configured collector');
 }
 return run;
}

export async function startApifyImport(){
 const {actorId,request}=apifyClient();
 const path=`acts/${encodeURIComponent(actorId)}/runs`;
 const rawInput=process.env.APIFY_ACTOR_INPUT_JSON?.trim();
 let input:Record<string,unknown>={};
 if(rawInput){
  try{input=z.record(z.string(),z.unknown()).parse(JSON.parse(rawInput));}
  catch{throw new Error('Configure APIFY_ACTOR_INPUT_JSON as a JSON object on the server');}
 }
 return database().begin(async tx=>{
  // Serialize start requests so simultaneous clicks reuse the active run.
  await tx`SELECT pg_advisory_xact_lock(hashtext(${'collected-apify:'+actorId})::bigint)`;
  const {data}=await request(`${path}?desc=1&limit=1`);
  const latest=data?.items?.[0];
  const run=collectorRun(activeStatuses.has(latest?.status)?latest:(await request(path,input)).data,actorId);
  return {runId:run.id,status:run.status};
 });
}

export async function getApifyImportStatus(input:unknown){
 const runId=runIdSchema.parse(input);
 const {actorId,request}=apifyClient();
 const run=collectorRun((await request(`actor-runs/${runId}`)).data,actorId);
 return {status:run.status,active:activeStatuses.has(run.status)};
}

export async function importApifyRun(input:unknown,fetcher:typeof fetch=fetch,store=createCollectedStore(database())){
 const runId=runIdSchema.parse(input);
 const {actorId,request}=apifyClient(fetcher);
 const {data:run}=await request(`actor-runs/${runId}`);
 if(run?.actId!==actorId||run.status!=='SUCCEEDED'||typeof run.defaultDatasetId!=='string'||!/^[A-Za-z0-9]+$/.test(run.defaultDatasetId))throw new Error('Run must be successful and belong to the configured collector');
 const rows:any[]=[];
 for(let offset=0;offset<=5000;offset+=250){const page=await request(`datasets/${run.defaultDatasetId}/items?format=json&offset=${offset}&limit=250`);if(!Array.isArray(page))throw new Error('Unexpected Apify dataset response');rows.push(...page);if(rows.length>5000)throw new Error('Run exceeds the 5000-story import limit');if(page.length<250)break;}
 return store.importRows(rows,runId);
}
