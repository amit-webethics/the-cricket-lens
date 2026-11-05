import Link from 'next/link';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {notFound} from 'next/navigation';
const formats:Record<string,string>={odi:'ODI',t20i:'T20I',test:'Test'};
export default async function PlayerPage({params}:{params:Promise<{format:string;id:string}>}){
 const {format,id}=await params;
 if(!formats[format])notFound();
 const data:any=await readFile(join(process.cwd(),`lib/data/${format}-records.json`),'utf8').then(JSON.parse).catch(()=>null);
 const player=data?.players?.find((p:any)=>p.id===id);
 if(!player)notFound();
 const seasons=Object.entries(data.seasons).map(([year,players]:[string,any])=>({year,stats:players.find((p:any)=>p.id===id)})).filter(p=>p.stats);
 return <main id="main" className="ipl-page"><p><Link href={`/records/${format}/`}>← {formats[format]} Records</Link></p><div className="ipl-intro"><span className="ipl-kicker">MEN'S {formats[format]} / PLAYER STATISTICS</span><h1>{player.name}</h1><p>Cricsheet historical match coverage</p></div><section className="ipl-section" style={{marginTop:24}}><div className="ipl-section-heading"><h2>Recorded Career Totals</h2><span>{player.matches} matches</span></div><div className="ipl-player-metrics">{[['Runs',player.runs],['Batting innings',player.innings],['Highest',player.highest],['Hundreds',player.hundreds],['Fifties',player.fifties],['Wickets',player.wickets],['Five-wicket hauls',player.fiveWickets]].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{value??'—'}</strong></div>)}</div><div className="ipl-section-heading" style={{marginTop:30}}><h2>Year-by-year performance</h2></div><div className="ipl-table-scroll"><table className="ipl-record-table"><thead><tr><th>Year / Season</th><th>Matches</th><th>Runs</th><th>Wickets</th><th>Fours</th><th>Sixes</th></tr></thead><tbody>{seasons.map(({year,stats}:any)=><tr key={year}><td>{year}</td><td>{stats.matches}</td><td>{stats.runs}</td><td>{stats.wickets}</td><td>{stats.fours}</td><td>{stats.sixes}</td></tr>)}</tbody></table></div><p className="ipl-stats-intro">Figures reflect Cricsheet-covered matches only, not necessarily complete international career totals. Source: <a href="https://cricsheet.org/">Cricsheet</a> (ODC-BY 1.0).</p></section></main>
}
