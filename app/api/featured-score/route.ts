import {NextResponse} from 'next/server';
import {database} from '../../../lib/cms/db';
import {featuredMatch,parseFeaturedScore,type FeaturedScore} from '../../../lib/featured-score';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function respond(score:FeaturedScore|null,enabled=true){
 return NextResponse.json({enabled,score},{headers:{'Cache-Control':'no-store','Vercel-CDN-Cache-Control':'public, s-maxage=60'}});
}

export async function GET(){
 const key=process.env.RAPIDAPI_KEY?.trim();
 const limit=Number(process.env.RAPIDAPI_SCORE_REQUEST_LIMIT);
 if(!key||!Number.isInteger(limit)||limit<1||limit>1000)return respond(null,false);
 const id=featuredMatch.id;
 try{
  const sql=database();
  // Reserve usage before the request. The shared row enforces the same budget across instances.
  const reserved=await sql`
   UPDATE featured_score_cache
   SET attempts=ARRAY(SELECT t FROM unnest(attempts) AS a(t) WHERE t>now()-interval '31 days') || ARRAY[now()]
   WHERE match_id=${id}
    AND COALESCE(snapshot->>'complete','false')<>'true'
    AND COALESCE(attempts[cardinality(attempts)],'-infinity'::timestamptz)<=now()-interval '15 minutes'
    AND (SELECT count(*) FROM unnest(attempts) AS a(t) WHERE t>now()-interval '31 days')<${limit}
   RETURNING match_id
  `;
  if(reserved.length){
   try{
    const host='cricbuzz-cricket.p.rapidapi.com';
    const response=await fetch(`https://${host}/mcenter/v1/${id}/scard`,{
     headers:{'x-rapidapi-key':key,'x-rapidapi-host':host},
     cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
    });
    if(response.ok){
     const score=parseFeaturedScore(await response.json(),new Date().toISOString());
     if(score){
      await sql`UPDATE featured_score_cache SET snapshot=${sql.json(score)} WHERE match_id=${id}`;
      return respond(score);
     }
    }
   }catch{
    // Preserve the previous snapshot if the provider is unavailable.
   }
  }
  const rows=await sql`SELECT snapshot FROM featured_score_cache WHERE match_id=${id}`;
  return respond(rows[0]?.snapshot??null);
 }catch{
  return respond(null);
 }
}
