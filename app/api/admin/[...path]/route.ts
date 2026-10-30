import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {database,listEntries,saveEntry} from '../../../../lib/cms/db';
import {sameOrigin} from '../../../../lib/cms/auth';import {isAdmin} from '../../../../lib/neon/server';
import {kinds,Kind} from '../../../../lib/cms/schema';
import {createCollectedStore,importApifyRun,runIdSchema} from '../../../../lib/cms/collected';
export const runtime='nodejs';
export const maxDuration=60;
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function handle(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){const {path}=await params;try{
 if(req.method!=='GET'&&!sameOrigin(req))return json({error:'Request origin is not allowed'},403);
 if(path[0]==='session'&&req.method==='GET')return json({configured:!!process.env.NEON_AUTH_BASE_URL,authenticated:await isAdmin()});
 if(!await isAdmin())return json({error:'Sign in with the authorised admin account'},401);
 if(path[0]==='collected'){
 const store=createCollectedStore(database());
 if(req.method==='GET')return json({items:await store.list(),configured:!!process.env.APIFY_API_TOKEN&&!!process.env.APIFY_ACTOR_ID});
 if(req.method==='POST'&&path[1]==='import'){const body=z.object({runId:runIdSchema}).parse(await req.json());return json(await importApifyRun(body.runId));}
 if(req.method==='POST'&&path[1]&&/^[a-f0-9]{64}$/.test(path[1])){const body=z.discriminatedUnion('action',[z.object({action:z.literal('dismiss')}),z.object({action:z.literal('draft'),kind:z.enum(['articles','news']),categoryId:z.uuid().optional(),authorId:z.uuid().optional()})]).parse(await req.json());
 if(body.action==='dismiss')return json({items:await store.dismiss(path[1])});
 return json({item:await store.convert(path[1],body)});}
 return json({error:'Method not allowed'},405);
 }
 if(path[0]==='media'){
 const sql=database();if(req.method==='GET'){const items=await sql`SELECT id,filename,mime_type,alt,credit,created_at,octet_length(bytes) AS size FROM cms_media ORDER BY created_at DESC`;return json({items});}
 if(req.method==='POST'){if(Number(req.headers.get('content-length')||0)>2300000)return json({error:'Choose an image smaller than 2 MB'},413);const form=await req.formData();const file=form.get('file');const alt=String(form.get('alt')||'').trim();const credit=String(form.get('credit')||'').trim();if(!(file instanceof File)||!alt||alt.length>250||credit.length>250)return json({error:'Choose an image and provide alternative text (maximum 250 characters).'},400);if(!file.size||file.size>2097152)return json({error:'Choose an image smaller than 2 MB'},413);const bytes=Buffer.from(await file.arrayBuffer());const valid=(file.type==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||(file.type==='image/webp'&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')||(file.type==='image/gif'&&/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()));if(!valid)return json({error:'Upload a valid PNG, JPEG, WebP or GIF image'},400);const rows=await sql`INSERT INTO cms_media(filename,mime_type,bytes,alt,credit) VALUES(${file.name.slice(0,200)},${file.type},${bytes},${alt},${credit}) RETURNING id`;return json({id:rows[0].id,url:`/api/media/${rows[0].id}`},201);}
 if(req.method==='PATCH'&&path[1]){z.uuid().parse(path[1]);const body=z.object({alt:z.string().trim().min(1).max(250),credit:z.string().max(250)}).parse(await req.json());const rows=await sql`UPDATE cms_media SET alt=${body.alt},credit=${body.credit} WHERE id=${path[1]} RETURNING id`;return rows.length?json({ok:true}):json({error:'Image not found'},404);}
 return json({error:'Method not allowed'},405);
 }
 const kind=path[0] as Kind;if(!kinds.includes(kind))return json({error:'Not found'},404);
 if(req.method==='GET')return json({items:await listEntries(kind)});
 if(req.method==='POST'&&path.length===1)return json({item:await saveEntry(kind,await req.json())},201);
 if(req.method==='PUT'&&path[1]){z.uuid().parse(path[1]);const {revision,...data}=await req.json();return json({item:await saveEntry(kind,data,path[1],z.number().int().positive().parse(revision))});}
 return json({error:'Method not allowed'},405);
 }catch(e:any){if(e instanceof z.ZodError)return json({error:e.issues.map((i:any)=>`${i.path.join('.')}: ${i.message}`).join('\n')},400);if(e.message==='RATE_LIMIT')return json({error:'Too many attempts. Please try again in 15 minutes.'},429);if(e.code==='23505')return json({error:'This URL slug is already in use. Choose another.'},409);if(e.message==='EDIT_CONFLICT')return json({error:'Someone updated this entry. Reload before saving your changes.'},409);if(e.message?.startsWith('Choose ')||e.message?.startsWith('This entry')||e.message?.startsWith('The settings'))return json({error:e.message},400);console.error('CMS request failed',{code:e.code||e.name});return json({error:'Unable to complete this request. Check database configuration and migrations.'},503);}}
export const GET=handle;export const POST=handle;export const PUT=handle;export const PATCH=handle;
