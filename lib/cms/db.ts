import postgres from 'postgres';
import {Kind,Entry,schemas} from './schema';
let client:ReturnType<typeof postgres>|undefined;
export function database(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');return client??=postgres(process.env.DATABASE_URL,{max:3,idle_timeout:20,connect_timeout:10,prepare:false});}
export async function closeDatabase(){if(client){await client.end();client=undefined;}}
const map=(r:any):Entry=>({id:r.id,kind:r.kind,title:r.title,slug:r.slug,status:r.status,data:r.data,revision:r.revision,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString(),publishedAt:r.published_at?new Date(r.published_at).toISOString():null});
export function createContentStore(sql:ReturnType<typeof postgres>){
async function listEntries(kind:Kind,publicOnly=false){const rows=publicOnly?await sql`SELECT * FROM cms_records WHERE kind=${kind} AND status='published' ORDER BY published_at DESC NULLS LAST,created_at DESC`:await sql`SELECT * FROM cms_records WHERE kind=${kind} ORDER BY updated_at DESC`;return rows.map(map);}
async function saveEntry(kind:Kind,input:unknown,id?:string,revision?:number){const data=schemas[kind].parse(input) as Record<string,any>;return sql.begin(async tx=>{
 // One transaction protects related-record checks and optimistic edit revisions.
 if(kind==='articles'){const cats=await tx`SELECT id FROM cms_records WHERE kind='categories' AND id=${data.categoryId} AND status='published' FOR SHARE`;const authors=await tx`SELECT id FROM cms_records WHERE kind='authors' AND id=${data.authorId} AND status='published' FOR SHARE`;if(!cats.length||!authors.length)throw new Error('Choose an active category and author');}
 if(['categories','authors'].includes(kind)&&id&&data.status!=='published'){await tx`SELECT id FROM cms_records WHERE id=${id} AND kind=${kind} FOR UPDATE`;const key=kind==='categories'?'categoryId':'authorId';const used=await tx`SELECT id FROM cms_records WHERE kind='articles' AND data->>${key}=${id} AND status!='archived'`;if(used.length)throw new Error('This entry is used by articles. Reassign or archive those articles first.');}
 if(kind==='settings'&&data.slug!=='site')throw new Error('The settings slug must be site');
 if(kind==='pages'&&!['about','contact','editorial','privacy','terms','corrections'].includes(data.slug))throw new Error('Choose a supported page');
 const json=tx.json(data);
 const rows=id?await tx`UPDATE cms_records SET title=${data.title},slug=${data.slug},status=${data.status},data=${json},revision=revision+1,updated_at=now(),published_at=CASE WHEN ${data.status}='published' THEN COALESCE(published_at,now()) ELSE published_at END WHERE id=${id} AND kind=${kind} AND revision=${revision??0} RETURNING *`:await tx`INSERT INTO cms_records(kind,title,slug,status,data,published_at) VALUES(${kind},${data.title},${data.slug},${data.status},${json},CASE WHEN ${data.status}='published' THEN now() ELSE NULL END) RETURNING *`;
 if(!rows.length)throw new Error('EDIT_CONFLICT');return map(rows[0]);
 });}

return {listEntries,saveEntry};}
export const listEntries=(kind:Kind,publicOnly=false)=>createContentStore(database()).listEntries(kind,publicOnly);
export const saveEntry=(kind:Kind,input:unknown,id?:string,revision?:number)=>createContentStore(database()).saveEntry(kind,input,id,revision);
