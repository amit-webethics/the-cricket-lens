'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';

type Player={id:string;name:string;runs:number;balls:number;fours:number;sixes:number;wickets:number;conceded:number;legalBalls:number;matches:number;dismissals:number;innings?:number;bowlingInnings?:number;highest?:number;hundreds?:number;fifties?:number;nineties?:number;fiveWickets?:number;bestWickets?:number;bestRuns?:number};
type Match={id:string;season:string;date:string;teams:string[];venue:string;outcome:any};
type Records={players:Player[];seasons:Record<string,Player[]>;matches:Match[]};
type Metric='runs'|'highest'|'average'|'strikeRate'|'hundreds'|'fifties'|'fours'|'sixes'|'nineties'|'wickets'|'bowlingAverage'|'bestBowling'|'fiveWickets'|'economy'|'bowlingStrikeRate';
const batting:{id:Metric;label:string}[]=[{id:'runs',label:'Most Runs'},{id:'highest',label:'Highest Scores'},{id:'average',label:'Best Batting Average'},{id:'strikeRate',label:'Best Batting Strike Rate'},{id:'hundreds',label:'Most Hundreds'},{id:'fifties',label:'Most Fifties'},{id:'fours',label:'Most Fours'},{id:'sixes',label:'Most Sixes'},{id:'nineties',label:'Most Nineties'}];
const bowling:{id:Metric;label:string}[]=[{id:'wickets',label:'Most Wickets'},{id:'bowlingAverage',label:'Best Bowling Average'},{id:'bestBowling',label:'Best Bowling'},{id:'fiveWickets',label:'Most 5 Wickets Haul'},{id:'economy',label:'Best Economy'},{id:'bowlingStrikeRate',label:'Best Bowling Strike Rate'}];
const fmt=(n:number)=>n.toLocaleString('en-IN');
function value(p:Player,m:Metric):number{switch(m){case 'average':return p.dismissals?p.runs/p.dismissals:p.runs?Infinity:0;case 'strikeRate':return p.balls?p.runs*100/p.balls:0;case 'bowlingAverage':return p.wickets?p.conceded/p.wickets:Infinity;case 'economy':return p.legalBalls?p.conceded*6/p.legalBalls:Infinity;case 'bowlingStrikeRate':return p.wickets?p.legalBalls/p.wickets:Infinity;case 'bestBowling':return (p.bestWickets||0)*10000-(p.bestRuns||0);default:return Number(p[m]||0)}}
const lower:Metric[]=['bowlingAverage','economy','bowlingStrikeRate'];
function shown(p:Player,m:Metric){if(m==='bestBowling')return (p.bestWickets||0)+'/'+(p.bestRuns||0);const v=value(p,m);return !Number.isFinite(v)?'—':['average','strikeRate','bowlingAverage','economy','bowlingStrikeRate'].includes(m)?v.toFixed(2):fmt(v)}
export default function IPLRecords({records,basePath="/ipl"}:{records:Records;basePath?:string}){
 const [season,setSeason]=useState('all');
 const [metric,setMetric]=useState<Metric>('runs');
 const [search,setSearch]=useState('');
 const [limit,setLimit]=useState(25);
 const seasons=Object.keys(records.seasons);
 const players=season==='all'?records.players:records.seasons[season]||[];
 const isBatting=batting.some(x=>x.id===metric);
 const minimum=season==='all'?10:3;
 const eligible=(p:Player)=>{if(metric==='average')return (p.innings||0)>=minimum&&p.dismissals>0;if(metric==='strikeRate')return p.balls>=(season==='all'?200:50);if(metric==='bowlingAverage'||metric==='bowlingStrikeRate')return p.wickets>=(season==='all'?20:5);if(metric==='economy')return p.legalBalls>=(season==='all'?120:30);if(metric==='bestBowling'||metric==='fiveWickets'||metric==='wickets')return p.wickets>0;if(metric==='highest'||metric==='hundreds'||metric==='fifties'||metric==='nineties')return (p.innings||0)>0;return true};
 const sorted=useMemo(()=>players.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())&&eligible(p)).sort((a,b)=>lower.includes(metric)?value(a,metric)-value(b,metric):value(b,metric)-value(a,metric)||a.name.localeCompare(b.name)),[players,search,metric,season]);
 const matches=records.matches.filter(m=>season==='all'||m.season===season);
 const selectMetric=(next:Metric)=>{setMetric(next);setLimit(25)};
 const metricLabel=[...batting,...bowling].find(m=>m.id===metric)?.label||'Statistics';
 return <div className="ipl-records">
 <div className="ipl-record-controls"><label>Season <select value={season} onChange={e=>{setSeason(e.target.value);setLimit(25)}}><option value="all">All seasons</option>{seasons.map(s=><option key={s} value={s}>{s}</option>)}</select></label><label>Find player <input type="search" placeholder="Search players" value={search} onChange={e=>{setSearch(e.target.value);setLimit(25)}}/></label></div>
 <div className="ipl-record-explorer"><aside className="ipl-record-menu" aria-label="IPL statistics categories"><h3>Batting</h3>{batting.map(m=><button key={m.id} className={metric===m.id?'active':''} onClick={()=>selectMetric(m.id)}>{m.label}<span aria-hidden="true">›</span></button>)}<h3>Bowling</h3>{bowling.map(m=><button key={m.id} className={metric===m.id?'active':''} onClick={()=>selectMetric(m.id)}>{m.label}<span aria-hidden="true">›</span></button>)}</aside>
  <div className="ipl-record-results">
    <div className="ipl-section-heading"><h2>{metricLabel}</h2><span>{season === 'all' ? 'All seasons' : season}</span></div>
    <div className="ipl-table-scroll">
      <table className="ipl-record-table">
        <thead>
          <tr>
            <th>#</th><th>Player</th><th>Matches</th><th>Inns</th>
            {isBatting ? (
              <><th>Runs</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th></>
            ) : (
              <><th>Wkts</th><th>Avg</th><th>Econ</th><th>Best</th></>
            )}
            <th>{metricLabel}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, limit).map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td><Link href={`${basePath}/players/${encodeURIComponent(p.id)}/`}>{p.name}</Link></td>
              <td>{p.matches}</td>
              <td>{isBatting ? (p.innings || '—') : (p.bowlingInnings || '—')}</td>
              {isBatting ? (
                <>
                  <td>{fmt(p.runs)}</td>
                  <td>{shown(p, 'average')}</td>
                  <td>{shown(p, 'strikeRate')}</td>
                  <td>{p.fours}</td>
                  <td>{p.sixes}</td>
                </>
              ) : (
                <>
                  <td>{p.wickets}</td>
                  <td>{shown(p, 'bowlingAverage')}</td>
                  <td>{shown(p, 'economy')}</td>
                  <td>{shown(p, 'bestBowling')}</td>
                </>
              )}
              <td><b>{shown(p, metric)}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!sorted.length && <p className="ipl-empty">No matching player records.</p>}
    {sorted.length > limit && <button className="ipl-more" onClick={() => setLimit(v => v + 25)}>Show more players</button>}
    <p className="ipl-stats-intro">Qualification for rate records: {season === 'all' ? 'minimum 10 batting innings / 200 balls for batting strike rate, 20 wickets for bowling averages, or 120 legal balls for economy' : 'minimum 3 batting innings / 50 balls for batting strike rate, 5 wickets for bowling averages, or 30 legal balls for economy'}. These are editorial thresholds, not official IPL eligibility rules.</p>
  </div>
  </div>
 <div className="ipl-section-heading" style={{marginTop:32}}><h2>Historical Matches</h2><span>{matches.length} matches</span></div><div className="ipl-match-list">{matches.slice(0,20).map(m=><Link href={`${basePath}/matches/${m.id}/`} key={m.id}><span>{m.date}</span><strong>{m.teams.join(' vs ')}</strong><small>{m.outcome?.winner?m.outcome.winner+' won':m.outcome?.result||'Match details'} · {m.venue}</small></Link>)}</div>{matches.length>20&&<p className="ipl-stats-intro">Showing the 20 most recent matches for the selected season.</p>}
 </div>;
}
