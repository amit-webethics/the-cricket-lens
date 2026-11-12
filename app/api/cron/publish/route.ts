import {NextRequest,NextResponse} from 'next/server';
import {publishDueEntries} from '../../../../lib/cms/db';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const secret=process.env.CRON_SECRET;if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});try{const published=await publishDueEntries();return NextResponse.json({ok:true,count:published.length,published});}catch(error){console.error('Scheduled publishing failed',error);return NextResponse.json({error:'Scheduled publishing failed'},{status:500});}}
