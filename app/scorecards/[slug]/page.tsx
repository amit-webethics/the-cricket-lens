import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {publicContent} from '../../../lib/cms/public';

type Figure={name:string;figure:string};
type Innings={team:string;total:string;batting:Figure[];bowling:Figure[]};
type Scorecard={match:string;date:string;venue:string;result:string;innings:Innings[]};
export default async function ScorecardPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {articles}=await publicContent();const article=articles.find(a=>a.slug===slug);if(!article?.scorecard)notFound();
 let score:Scorecard;try{score=JSON.parse(article.scorecard);if(!Array.isArray(score.innings)||score.innings.length!==2)notFound()}catch{notFound()}
 return <main id="main" className="score-page"><Link className="back-link" href={`/articles/${slug}/`}><ArrowLeft size={16}/> Back to match report</Link><header className="score-header"><p className="score-eyebrow">{article.series||'MATCH SCORECARD'}</p><h1>{score.match}</h1><p>{score.date} · {score.venue}</p><div className="score-totals">{score.innings.map(i=><div key={i.team}><span>{i.team}</span><strong>{i.total}</strong></div>)}</div><p className="score-result">{score.result}</p></header><p className="score-note">Key match figures · Figures in parentheses show balls faced or overs bowled.</p><div className="innings-list">{score.innings.map(i=><section className="innings" key={i.team}><div className="innings-head"><h2>{i.team} innings</h2><strong>{i.total}</strong></div><h3>Batting highlights</h3><table><thead><tr><th scope="col">Batter</th><th scope="col">Runs (balls)</th></tr></thead><tbody>{i.batting.map((b,n)=><tr key={n}><td>{b.name}</td><td>{b.figure}</td></tr>)}</tbody></table><h3>Bowling highlights</h3><table><thead><tr><th scope="col">Bowler</th><th scope="col">Wickets / runs (overs)</th></tr></thead><tbody>{i.bowling.map((b,n)=><tr key={n}><td>{b.name}</td><td>{b.figure}</td></tr>)}</tbody></table></section>)}</div><div className="score-sources"><b>Match sources</b>{article.sources?.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a>)}</div></main>
}
