import {NextResponse} from 'next/server';
import {database} from '../../../lib/cms/db';
import {featuredMatch,parseCricbuzzScore,parseFeaturedScore,type FeaturedScore} from '../../../lib/featured-score';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function respond(score:FeaturedScore|null,enabled=true,message=''){
 return NextResponse.json({enabled,score,message},{headers:{'Cache-Control':'no-store'}});
}

export function GET(){return scoreResponse(false);}
export function POST(){return scoreResponse(true);}

async function scoreResponse(refresh:boolean){
 const rapidKey=process.env.RAPIDAPI_KEY?.trim();
 const rapidLimit=Number(process.env.RAPIDAPI_SCORE_REQUEST_LIMIT);
 const useRapid=!!rapidKey&&Number.isInteger(rapidLimit)&&rapidLimit>=1&&rapidLimit<=1000;
 const cricketDataKey=process.env.CRICKETDATA_API_KEY?.trim();
 const enabled=useRapid||!!cricketDataKey;
 const id=featuredMatch.id;
 try{
  const sql=database();
  if(refresh&&enabled){
   await sql`INSERT INTO featured_score_cache (match_id) VALUES (${id}) ON CONFLICT DO NOTHING`;
  }
  const window=useRapid?'31 days':'24 hours';
  const limit=useRapid?rapidLimit:96;
  // Reserve a refresh before contacting the provider, across all server instances.
  const reserved=refresh&&enabled?await sql`
   UPDATE featured_score_cache
   SET attempts=ARRAY(SELECT t FROM unnest(attempts) AS a(t) WHERE t>now()-${window}::interval) || ARRAY[now()]
   WHERE match_id=${id}
    AND COALESCE(snapshot->>'complete','false')<>'true'
    AND COALESCE(attempts[cardinality(attempts)],'-infinity'::timestamptz)<=now()-interval '15 minutes'
    AND (SELECT count(*) FROM unnest(attempts) AS a(t) WHERE t>now()-${window}::interval)<${limit}
   RETURNING match_id
  `:[];
  if(reserved.length){
   try{
    const host='cricbuzz-cricket.p.rapidapi.com';
    const url=useRapid?new URL(`https://${host}/mcenter/v1/${id}/scard`):new URL('https://api.cricapi.com/v1/currentMatches');
    if(!useRapid)url.search=new URLSearchParams({apikey:cricketDataKey!,offset:'0'}).toString();
    const response=await fetch(url,{
     headers:useRapid?{'x-rapidapi-key':rapidKey,'x-rapidapi-host':host}:undefined,
     cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
    });
    if(response.ok){
     const parse=useRapid?parseCricbuzzScore:parseFeaturedScore;
     const score=parse(await response.json(),new Date().toISOString());
     if(score&&(score.innings.length>0||score.complete)){
      await sql`UPDATE featured_score_cache SET snapshot=${sql.json(score)} WHERE match_id=${id}`;
      return respond(score);
     }
    }
   }catch{
    // Preserve the previous snapshot if the provider is unavailable.
   }
  }
  const rows=await sql`SELECT snapshot FROM featured_score_cache WHERE match_id=${id}`;
  const snapshot:FeaturedScore|null=rows[0]?.snapshot??null;
  const message=refresh&&enabled&&!snapshot?.complete
   ?reserved.length?'A fresh score is unavailable. See Cricbuzz for the latest.':'A refresh is unavailable at the moment. See Cricbuzz for the latest.'
   :'';
  return respond(snapshot,enabled,message);
 }catch{
  return respond(null,false,'Score feed is temporarily unavailable.');
 }
}
