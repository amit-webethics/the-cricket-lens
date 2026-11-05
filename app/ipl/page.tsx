import Link from 'next/link';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {Metadata} from 'next';
import {publicContent} from '../../lib/cms/public';

export const metadata:Metadata={title:'IPL — News, Articles & Statistics',description:'Indian Premier League news, analysis, historical records and statistics from The Cricket Lens.'};

function isIPL(item:any){const text=[item.title,item.description,item.summary,item.series,item.category,...(Array.isArray(item.tags)?item.tags:[])].filter(Boolean).join(' ');return /\bIPL\b|Indian Premier League|IPL\s*20\d\d/i.test(text);}
function published(item:any){const date=item.publishedAt||item.createdAt;return date?new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'';}
export default async function IPLPage(){
 const {articles,news}=await publicContent();
 const stats:any=await readFile(join(process.cwd(),'lib/data/ipl-stats.json'),'utf8').then(JSON.parse).catch(()=>null);
 const iplArticles=articles.filter(isIPL).sort((a,b)=>new Date(b.publishedAt||b.createdAt||0).getTime()-new Date(a.publishedAt||a.createdAt||0).getTime());
 const iplNews=news.filter(isIPL).sort((a:any,b:any)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime());
 return <main id="main" className="ipl-page">
  <div className="ipl-intro"><span className="ipl-kicker">THE CRICKET LENS / INDIAN PREMIER LEAGUE</span><h1>IPL</h1><p>News, analysis and the numbers behind the Indian Premier League.</p><div className="ipl-jump"><a href="#ipl-news">Latest News</a><a href="#ipl-articles">Articles & Analysis</a><a href="#ipl-stats">IPL Statistics</a></div></div>
  <div className="ipl-content">
   <section id="ipl-news" className="ipl-section"><div className="ipl-section-heading"><h2>IPL News</h2><span>Latest updates</span></div>{iplNews.length?<div className="ipl-story-list">{iplNews.map((n:any)=><article key={n.slug}><span className="ipl-date">{published(n)}</span><h3><Link href={`/news/${n.slug}/`}>{n.title}</Link></h3>{n.summary&&<p>{n.summary}</p>}</article>)}</div>:<p className="ipl-empty">No IPL news has been published yet. New IPL updates will appear here automatically.</p>}</section>
   <section id="ipl-articles" className="ipl-section"><div className="ipl-section-heading"><h2>IPL Articles & Analysis</h2><span>Our perspective</span></div>{iplArticles.length?<div className="ipl-story-list">{iplArticles.map(a=><article key={a.slug}><span className="ipl-date">{published(a)}</span><h3><Link href={`/articles/${a.slug}/`}>{a.title}</Link></h3>{a.description&&<p>{a.description}</p>}</article>)}</div>:<p className="ipl-empty">No IPL articles have been published yet. Articles tagged with IPL will appear here automatically.</p>}</section>
   <section id="ipl-stats" className="ipl-section"><div className="ipl-section-heading"><h2>IPL Statistics</h2><span>Historical records · 2008 onwards</span></div><p className="ipl-stats-intro">A dedicated home for season-by-season IPL statistics and all-time records. Historical data will be displayed once its source and accuracy have been verified.</p>{stats?.coverage&&<p className="ipl-stats-intro">Cricsheet coverage: {stats.coverage.matches} matches ({stats.coverage.firstDate} to {stats.coverage.lastDate}). Statistics reflect available recorded deliveries, not necessarily every IPL match. <a href="https://cricsheet.org/" target="_blank" rel="noopener noreferrer">Data: Cricsheet (ODC-BY 1.0)</a>.</p>}{stats?.batting?.length&&stats?.bowling?.length?<div className="ipl-stats-grid"><div><h3>Most Runs</h3><ol>{stats.batting.slice(0,10).map((p:any)=><li key={p.id}>{p.name} — {p.runs.toLocaleString('en-IN')}</li>)}</ol></div><div><h3>Most Wickets</h3><ol>{stats.bowling.slice(0,10).map((p:any)=><li key={p.id}>{p.name} — {p.wickets}</li>)}</ol></div><div><h3>Seasons Covered</h3><ol>{stats.seasons.map((p:any)=><li key={p.year}>{p.year} — {p.matches} matches</li>)}</ol></div><div><h3>Team Match Wins</h3><ol>{stats.teams.slice(0,10).map((p:any)=><li key={p.name}>{p.name} — {p.wins}</li>)}</ol></div></div>:<div className="ipl-stats-grid"><div><h3>Most Runs</h3><p>All-time leading run scorers</p><span>Data import pending</span></div><div><h3>Most Wickets</h3><p>All-time leading wicket takers</p><span>Data import pending</span></div><div><h3>Season Records</h3><p>Season-by-season batting and bowling leaders</p><span>Data import pending</span></div><div><h3>Team Records</h3><p>Results, titles and team performances</p><span>Data import pending</span></div></div>}</section>
  </div>
 </main>;
}
