'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';

type Player={id:string;name:string;runs:number;balls:number;fours:number;sixes:number;wickets:number;conceded:number;legalBalls:number;matches:number;dismissals:number};
type Match={id:string;season:string;date:string;teams:string[];venue:string;outcome:any};
type Records={players:Player[];seasons:Record<string,Player[]>;matches:Match[]};
const fmt=(n:number)=>n.toLocaleString('en-IN');
export default function IPLRecords({records}:{records:Records}){
 const [season,setSeason]=useState('all');
 const [type,setType]=useState<'batting'|'bowling'>('batting');
 const [search,setSearch]=useState('');
 const [limit,setLimit]=useState(25);
 const seasons=Object.keys(records.seasons);
 const players=season==='all'?records.players:records.seasons[season]||[];
 const sorted=useMemo(()=>players.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>type==='batting'?b.runs-a.runs||a.name.localeCompare(b.name):b.wickets-a.wickets||a.name.localeCompare(b.name)),[players,search,type]);
 const matches=records.matches.filter(m=>season==='all'||m.season===season);
 return <div className="ipl-records">
 <div className="ipl-record-controls"><label>Season <select value={season} onChange={e=>{setSeason(e.target.value);setLimit(25)}}><option value="all">All seasons</option>{seasons.map(s=><option key={s} value={s}>{s}</option>)}</select></label><label>Find player <input type="search" placeholder="Search players" value={search} onChange={e=>{setSearch(e.target.value);setLimit(25)}}/></label></div>
 <div className="ipl-record-tabs"><button className={type==='batting'?'active':''} onClick={()=>{setType('batting');setLimit(25)}}>Batting</button><button className={type==='bowling'?'active':''} onClick={()=>{setType('bowling');setLimit(25)}}>Bowling</button></div>
 <div className="ipl-table-scroll"><table className="ipl-record-table"><thead><tr><th>#</th><th>Player</th><th>Matches</th>{type==='batting'?<><th>Runs</th><th>Balls</th><th>SR</th><th>4s</th><th>6s</th></>:<><th>Wickets</th><th>Balls</th><th>Economy</th></>}</tr></thead><tbody>{sorted.slice(0,limit).map((p,i)=><tr key={p.id}><td>{i+1}</td><td><Link href={`/ipl/players/${encodeURIComponent(p.id)}/`}>{p.name}</Link></td><td>{p.matches}</td>{type==='batting'?<><td><b>{fmt(p.runs)}</b></td><td>{fmt(p.balls)}</td><td>{p.balls?(p.runs*100/p.balls).toFixed(2):'—'}</td><td>{p.fours}</td><td>{p.sixes}</td></>:<><td><b>{p.wickets}</b></td><td>{fmt(p.legalBalls)}</td><td>{p.legalBalls?(p.conceded*6/p.legalBalls).toFixed(2):'—'}</td></>}</tr>)}</tbody></table></div>
 {!sorted.length&&<p className="ipl-empty">No matching player records.</p>}{sorted.length>limit&&<button className="ipl-more" onClick={()=>setLimit(v=>v+25)}>Show more players</button>}
 <div className="ipl-section-heading" style={{marginTop:32}}><h2>Historical Matches</h2><span>{matches.length} matches</span></div>
 <div className="ipl-match-list">{matches.slice(0,20).map(m=><Link href={`/ipl/matches/${m.id}/`} key={m.id}><span>{m.date}</span><strong>{m.teams.join(' vs ')}</strong><small>{m.outcome?.winner?m.outcome.winner+' won':m.outcome?.result||'Match details'} · {m.venue}</small></Link>)}</div>
 {matches.length>20&&<p className="ipl-stats-intro">Showing 20 most recent matches for the selected season. Player records cover all imported matches.</p>}
 </div>;
}
