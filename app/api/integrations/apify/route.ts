import {NextRequest,NextResponse} from 'next/server';
import {importApifyRun,webhookAuthorized} from '../../../../lib/cms/collected';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:NextRequest){
 if(!webhookAuthorized(req.headers.get('authorization')))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const body=await req.json();
  if(body.eventType!=='ACTOR.RUN.SUCCEEDED')return NextResponse.json({error:'Unsupported event'},{status:400});
  const result=await importApifyRun(body.resource?.id);
  return NextResponse.json(result);
 }catch{console.error('Apify import failed');return NextResponse.json({error:'Import failed; check the run and server configuration. Retry this run from the admin.'},{status:503});}
}
