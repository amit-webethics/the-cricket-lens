import Link from 'next/link';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {notFound} from 'next/navigation';
export default async function MatchPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const data:any=await readFile(join(process.cwd(),'lib/data/ipl-records.json'),'utf8').then(JSON.parse).catch(()=>null);
 const match=data?.matches?.find((m:any)=>m.id===id);
 if(!match)notFound();
 const result=match.outcome?.winner?match.outcome.winner+' won':match.outcome?.result||'Result unavailable';
 return <main id="main" className="ipl-page"><Link href="/ipl/#ipl-stats" className="back-link">← IPL records</Link><div className="ipl-intro"><span className="ipl-kicker">IPL / {match.season} / {match.date}</span><h1>{match.teams.join(' vs ')}</h1><p>{result}</p></div><section className="ipl-section"><div className="ipl-section-heading"><h2>Match Information</h2></div><p>Date: {match.date}</p><p>Season: {match.season}</p><p>Venue: {match.venue||'Not recorded'}</p><p>Result: {result}</p><p className="ipl-stats-intro">Match metadata from Cricsheet (ODC-BY 1.0). Detailed innings scorecards will follow.</p></section></main>;
}
