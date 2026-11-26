import postgres from 'postgres';
import {Kind,Entry,schemas} from './schema';
import type {ArticleGroupFields} from './article-groups';
import type {importedArticleContent} from './draft-markdown';
let client:ReturnType<typeof postgres>|undefined;
export function database(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');return client??=postgres(process.env.DATABASE_URL,{max:3,idle_timeout:20,connect_timeout:10,prepare:false});}
export async function closeDatabase(){if(client){await client.end();client=undefined;}}
const map=(r:any):Entry=>({id:r.id,kind:r.kind,title:r.title,slug:r.slug,status:r.status,data:r.data,revision:r.revision,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString(),publishedAt:r.published_at?new Date(r.published_at).toISOString():null});
async function requireActiveEditorialReferences(tx:postgres.TransactionSql,categoryId:string,authorId:string){
 for(const [kind,id] of [['categories',categoryId],['authors',authorId]] as const){
  if(!id)continue;
  const found=await tx`SELECT id FROM cms_records WHERE kind=${kind} AND id=${id} AND status='published' FOR SHARE`;
  if(!found.length)throw new Error('Choose an active category and author');
 }
}

async function validateArticleGroup(tx:postgres.TransactionSql,data:ArticleGroupFields,id?:string){
 const parentId=data.parentArticleId;
 if(parentId&&parentId===id)throw new Error('Choose a different article as the main article');
 const ids=[id,parentId].filter((value):value is string=>!!value);
 if(!ids.length)return;
 // Lock the current article and its prospective parent in the same order for every save.
 const articles=await tx`SELECT id,data->>'articleRole' AS role FROM cms_records
  WHERE kind='articles' AND id IN (SELECT value::uuid FROM jsonb_array_elements_text(${tx.json(ids)}::jsonb))
  ORDER BY id FOR UPDATE`;
 if(parentId&&!articles.some(article=>article.id===parentId&&article.role==='main')){
  throw new Error('Choose an article that is saved as a main article');
 }
 if(id&&data.articleRole!=='main'&&articles.some(article=>article.id===id&&article.role==='main')){
  const children=await tx`SELECT id FROM cms_records WHERE kind='articles'
   AND data->>'articleRole'='child' AND data->>'parentArticleId'=${id} LIMIT 1`;
  if(children.length)throw new Error('This entry still has child articles. Move or unlink them before changing its role.');
 }
}

export function createContentStore(sql:ReturnType<typeof postgres>,inTransaction=false){
const transact=inTransaction?((fn:any)=>fn(sql)) as typeof sql.begin:sql.begin.bind(sql);
async function listEntries(kind:Kind,publicOnly=false){const rows=publicOnly?await sql`SELECT id,kind,title,slug,status,(data - 'sourceContent') AS data,revision,created_at,updated_at,published_at FROM cms_records WHERE kind=${kind} AND status='published' ORDER BY published_at DESC NULLS LAST,created_at DESC`:await sql`SELECT * FROM cms_records WHERE kind=${kind} ORDER BY updated_at DESC`;return rows.map(map);}
async function saveEntry(kind:Kind,input:unknown,id?:string,revision?:number){const data=schemas[kind].parse(input) as Record<string,any>;return transact(async tx=>{
 // One transaction protects related-record checks and optimistic edit revisions.
 if(kind==='articles'||kind==='news')await requireActiveEditorialReferences(tx,data.categoryId,data.authorId);
 if(kind==='articles')await validateArticleGroup(tx,data,id);
 if(['categories','authors'].includes(kind)&&id&&data.status!=='published'){await tx`SELECT id FROM cms_records WHERE id=${id} AND kind=${kind} FOR UPDATE`;const key=kind==='categories'?'categoryId':'authorId';const used=await tx`SELECT id FROM cms_records WHERE kind IN ('articles','news') AND data->>${key}=${id} AND status!='archived'`;if(used.length)throw new Error('This entry is used by articles or news. Reassign or archive those articles first.');}
 if((kind==='articles'||kind==='news')&&data.status==='scheduled'&&(!data.scheduledAt||Date.parse(data.scheduledAt)<=Date.now()))throw new Error('Choose a future scheduled time');
 if(kind==='settings'&&data.slug!=='site')throw new Error('The settings slug must be site');
 if(kind==='pages'&&!['about','contact','editorial','privacy','terms','corrections'].includes(data.slug))throw new Error('Choose a supported page');
 const json=tx.json(data);
 const rows=id?await tx`UPDATE cms_records SET title=${data.title},slug=${data.slug},status=${data.status},data=${json},revision=revision+1,updated_at=now(),published_at=CASE WHEN ${data.status}='published' THEN COALESCE(published_at,now()) ELSE published_at END WHERE id=${id} AND kind=${kind} AND revision=${revision??0} RETURNING *`:await tx`INSERT INTO cms_records(kind,title,slug,status,data,published_at) VALUES(${kind},${data.title},${data.slug},${data.status},${json},CASE WHEN ${data.status}='published' THEN now() ELSE NULL END) RETURNING *`;
 if(!rows.length)throw new Error('EDIT_CONFLICT');return map(rows[0]);
 });}

async function existingArticleSlugs(slugs:string[]){
 const rows=await sql`SELECT slug FROM cms_records WHERE kind='articles'
  AND slug IN (SELECT jsonb_array_elements_text(${sql.json(slugs)}::jsonb))`;
 return rows.map(row=>String(row.slug));
}

async function articleImportMatches(slugs:string[]){
 return sql<Pick<Entry,'id'|'slug'|'title'|'status'|'revision'>[]>`
  SELECT id,slug,title,status,revision FROM cms_records WHERE kind='articles'
  AND slug IN (SELECT jsonb_array_elements_text(${sql.json(slugs)}::jsonb))`;
}

async function updateImportedArticles(updates:{slug:string;revision:number;content:ReturnType<typeof importedArticleContent>}[]){
 return transact(async tx=>{
  const rows=await tx<Pick<Entry,'id'|'slug'|'title'|'status'>[]>`
   WITH desired AS (
    SELECT * FROM jsonb_to_recordset(${tx.json(updates)}::jsonb) AS p(slug text,revision integer,content jsonb)
   ), eligible AS MATERIALIZED (
    SELECT a.id, d.content FROM cms_records a JOIN desired d ON d.slug=a.slug AND d.revision=a.revision
    WHERE a.kind='articles' ORDER BY a.id FOR UPDATE OF a
   )
   UPDATE cms_records a SET title=e.content->>'title', data=a.data || e.content,
    revision=a.revision+1, updated_at=now()
   FROM eligible e WHERE a.id=e.id AND (SELECT count(*) FROM eligible)=${updates.length}
   RETURNING a.id,a.slug,a.title,a.status`;
  if(rows.length!==updates.length)throw new Error('EDIT_CONFLICT');
  return rows;
 });
}

async function importArticleDrafts(articles:Record<string,unknown>[],categoryId:string,authorId:string){
 const drafts=articles.map(article=>schemas.articles.parse({
  ...article,categoryId,authorId,status:'draft',scheduledAt:'',verified:false,featured:false,articleRole:'standalone',
 }));
 return transact(async tx=>{
  await requireActiveEditorialReferences(tx,categoryId,authorId);
  const rows=await tx<Pick<Entry,'id'|'slug'|'title'>[]>`
   INSERT INTO cms_records(kind,title,slug,status,data)
   SELECT 'articles',draft->>'title',draft->>'slug','draft',draft
   FROM jsonb_array_elements(${tx.json(drafts)}::jsonb) AS draft
   ORDER BY draft->>'slug'
   ON CONFLICT (kind,slug) DO NOTHING
   RETURNING id,slug,title`;
  const inserted=new Map(rows.map(row=>[row.slug,row]));
  return {
   imported:drafts.flatMap(draft=>{const row=inserted.get(draft.slug);return row?[row]:[];}),
   skipped:drafts.filter(draft=>!inserted.has(draft.slug)).map(({slug,title})=>({slug,title})),
  };
 });
}

return {listEntries,saveEntry,existingArticleSlugs,articleImportMatches,importArticleDrafts,updateImportedArticles};}
export async function publishDueEntries(){const sql=database();const rows=await sql`UPDATE cms_records SET status='published',data=jsonb_set(data,'{status}','\"published\"'::jsonb),revision=revision+1,updated_at=now(),published_at=now() WHERE kind IN ('articles','news') AND status='scheduled' AND (data->>'scheduledAt')::timestamptz <= now() RETURNING id,kind,slug,title`;return rows.map(r=>({id:r.id,kind:r.kind,slug:r.slug,title:r.title}));}
export const listEntries=(kind:Kind,publicOnly=false)=>createContentStore(database()).listEntries(kind,publicOnly);
export const saveEntry=(kind:Kind,input:unknown,id?:string,revision?:number)=>createContentStore(database()).saveEntry(kind,input,id,revision);
