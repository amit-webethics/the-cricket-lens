import Link from 'next/link';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {notFound} from 'next/navigation';
const formats:Record<string,string>={odi:'ODI',t20i:'T20I',test:'Test'};
export default async function MatchPage({params}:{params:Promise<{format:string;id:string}>}){
 const {format,id}=await params;
 if(!formats[format])notFound();
 const data:any=await readFile(join(process.cwd(),`lib/data/${format}-records.json`),'utf8').then(JSON.parse).catch(()=>null);
 const match=data?.matches?.find((m:any)=>m.id===id);
 if(!match)notFound();
 const result=match.outcome?.winner?match.outcome.winner+' won':match.outcome?.result||'Result unavailable';
 return <main id="main" className="ipl-page"><p><Link href={`/records/${format}/`}>← {formats[format]} Records</Link></p><div className="ipl-intro"><span className="ipl-kicker">MEN'S {formats[format]} / {match.date}</span><h1>{match.teams.join(' vs ')}</h1><p>{result}</p></div><section className="ipl-section" style={{marginTop:24}}><div className="ipl-section-heading"><h2>Match Details</h2></div><p>Date: {match.date}</p><p>Venue: {match.venue||'Not recorded'}</p><p>Result: {result}</p><p className="ipl-stats-intro">Source: Cricsheet (ODC-BY 1.0). Full scorecard presentation is planned separately.</p></section></main>
}
