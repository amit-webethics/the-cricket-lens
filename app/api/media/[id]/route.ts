import {database} from '../../../../lib/cms/db';
import {z} from 'zod';
export const runtime='nodejs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;if(!z.uuid().safeParse(id).success)return new Response('Not found',{status:404});try{const rows=await database()`SELECT bytes,mime_type FROM cms_media WHERE id=${id}`;if(!rows.length)return new Response('Not found',{status:404});return new Response(new Uint8Array(rows[0].bytes),{headers:{'Content-Type':rows[0].mime_type,'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}catch{return new Response('Media unavailable',{status:503});}}
