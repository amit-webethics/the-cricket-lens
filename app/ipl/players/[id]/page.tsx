import Link from 'next/link';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {notFound} from 'next/navigation';
export default async function PlayerPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const data:any=await readFile(join(process.cwd(),'lib/data/ipl-records.json'),'utf8').then(JSON.parse).catch(()=>null);
 const player=data?.players?.find((p:any)=>p.id===id);
 if(!player)notFound();
 const seasons=Object.entries(data.seasons).map(([year,players]:[string,any])=>({year,stats:players.find((p:any)=>p.id===id)})).filter(p=>p.stats);
 return <main id="main" className="ipl-page"><Link href="/ipl/#ipl-stats" className="back-link">← IPL Statistics</Link><div className="ipl-intro"><span className="ipl-kicker">IPL / PLAYER RECORDS</span><h1>{player.name}</h1><p>Cricsheet ball-by-ball statistics · IPL 2008 onwards</p></div><section className="ipl-section"><div className="ipl-section-heading"><h2>Career Overview</h2><span>{player.matches} matches recorded</span></div><div className="ipl-player-metrics">{[['Runs',player.runs],['Balls faced',player.balls],['Strike rate',player.balls?(100*player.runs/player.balls).toFixed(2):'—'],['Fours',player.fours],['Sixes',player.sixes],['Wickets',player.wickets],['Economy',player.legalBalls?(6*player.conceded/player.legalBalls).toFixed(2):'—']].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="ipl-section-heading" style={{marginTop:32}}><h2>Season by Season</h2></div><div className="ipl-table-scroll"><table className="ipl-record-table"><thead><tr><th>Season</th><th>Matches</th><th>Runs</th><th>Balls</th><th>SR</th><th>Wickets</th><th>Economy</th></tr></thead><tbody>{seasons.map(({year,stats}:any)=><tr key={year}><td>{year}</td><td>{stats.matches}</td><td>{stats.runs}</td><td>{stats.balls}</td><td>{stats.balls?(stats.runs*100/stats.balls).toFixed(2):'—'}</td><td>{stats.wickets}</td><td>{stats.legalBalls?(stats.conceded*6/stats.legalBalls).toFixed(2):'—'}</td></tr>)}</tbody></table></div><p className="ipl-stats-intro">Derived from available Cricsheet match deliveries. Super Overs excluded. <a href="https://cricsheet.org/">Source: Cricsheet (ODC-BY 1.0)</a>.</p></section></main>;
}
