import {publicContent} from '../../../lib/cms/public';
export async function GET(){try{return Response.json(await publicContent(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Content is temporarily unavailable'},{status:503})}}
