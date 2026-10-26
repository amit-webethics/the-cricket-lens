'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowRight,ArrowUpRight,Search,X,Newspaper} from 'lucide-react';
import type {PublicArticle} from '../lib/cms/public';
type Category=string;
import Art from './Art';
const sources=[{name:'ICC',description:'International cricket and tournament announcements',url:'https://www.icc-cricket.com/news'},{name:'BCCI',description:'India team announcements and official updates',url:'https://www.bcci.tv/'},{name:'New Zealand Cricket',description:'BLACKCAPS news and tour updates',url:'https://www.nzc.nz/'}];
export default function Home({articles,categories:categoryNames,news=[],sample=true}:{articles:PublicArticle[];categories:string[];news?:any[];sample?:boolean}){
 const categories=['All stories',...categoryNames];
 const params=useSearchParams();
 const [choice,setChoice]=useState<{category:Category;url:string}|null>(null);
 const [query,setQuery]=useState('');
 const fromUrl=params.get('category') as Category;
 const selected=(choice?.url===params.toString()?choice.category:null)??(categories.includes(fromUrl)?fromUrl:'All stories');
 const setSelection=(category:Category)=>setChoice({category,url:params.toString()});
 const filtered=articles.filter(a=>(selected==='All stories'||a.category===selected)&&`${a.title} ${a.description} ${a.category}`.toLowerCase().includes(query.toLowerCase()));
 const [showAll,setShowAll]=useState(false);
 const visible=showAll?filtered:filtered.slice(0,4);
 return <main id="main">
 <div className="edition-row"><span><b>THE LENS /</b> The game. The stories. Our perspective.</span><span>INDEPENDENT CRICKET JOURNAL</span></div>
 <div className="publication-grid">
 <aside className="recent-sidebar" aria-labelledby="recent-title"><h2 className="panel-title" id="recent-title">Recent Articles</h2><div className="recent-list">{[...articles].sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime()).slice(0,8).map((a,i)=><Link href={`/articles/${a.slug}/`} key={a.slug}><span className="recent-index">{String(i+1).padStart(2,'0')}</span><div><span className="card-category">{a.category}</span><h3>{a.title}</h3><span className="meta">{a.minutes} min read{a.label?' · Draft':''}</span></div></Link>)}</div><div className="sidebar-about"><span className="eyebrow">OUR PERSPECTIVE</span><p>Beyond the scorecard.<br/>Closer to the story.</p><Link href="/about/">Meet the Lens <ArrowUpRight size={15}/></Link></div></aside>
 <section className="latest-column" id="stories" aria-labelledby="latest-title"><div className="feed-heading"><div><span className="eyebrow">THE LATEST FROM THE LENS</span><h1 id="latest-title">Latest stories</h1></div><span className="feed-count">{filtered.length} stories</span></div>
 <div className="story-controls"><div className="filters" aria-label="Filter stories">{categories.map(c=><button key={c} className={selected===c?'active':''} aria-pressed={selected===c} onClick={()=>{setSelection(c);setShowAll(false)}}>{c==='Opinions & Explainers'?'Opinions':c}</button>)}</div><div className="search-box"><Search size={16}/><input aria-label="Search stories" placeholder="Find a story…" value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false)}}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={15}/></button>}</div></div>
 <div className="article-feed">{visible.map((a,i)=><article key={a.slug} className={`feed-card ${i===0?'lead-card':''}`}><Link href={`/articles/${a.slug}/`} className="card-art" aria-label={a.title}>{a.imageUrl?<img className="article-cover" src={a.imageUrl} alt={a.imageAlt||''}/>:<Art kind={a.art}/>}<span className="feed-image-label">{i===0?'EDITOR’S PICK':a.category}</span><span className="card-arrow"><ArrowUpRight size={20}/></span></Link><div className="feed-copy"><div className="card-category">{a.category}{a.label&&<span className="draft-pill">DRAFT</span>}</div><h2><Link href={`/articles/${a.slug}/`}>{a.title}</Link></h2><p>{a.description}</p><div className="feed-bottom"><div className="meta"><span>{a.author||'The Cricket Lens'}</span><span>{a.minutes} min read</span></div><Link className="read-link" href={`/articles/${a.slug}/`}>Read article <ArrowRight size={15}/></Link></div></div></article>)}</div>
 {!filtered.length&&<div className="empty"><h3>No stories found.</h3><p>Try another search or category.</p><button className="text-button" onClick={()=>{setQuery('');setSelection('All stories')}}>Show all stories <ArrowRight size={18}/></button></div>}
 {filtered.length>visible.length&&<button className="load-stories" onClick={()=>setShowAll(true)}>More stories <ArrowRight size={17}/></button>}
 </section>
 <aside className="news-sidebar" aria-labelledby="news-title"><h2 className="panel-title" id="news-title"><Newspaper size={18}/>Cricket News</h2>{news.length?<div className="public-news-list">{news.slice(0,8).map((n:any)=><article key={n.slug}><span className="card-category">{n.team||'Cricket update'}</span><h3>{n.title}</h3><p>{n.summary}</p><div><time dateTime={n.publishedAt}>{new Date(n.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</time><a href={n.sourceUrl} target="_blank" rel="noopener noreferrer">{n.sourceLabel} ↗</a></div></article>)}</div>:<div className="news-intro"><span className="news-status">{sample?'NEWS DESK · COMING SOON':'NEWS DESK'}</span><p>Around the cricket world</p><span>{sample?'Verified updates will appear here after the admin and PostgreSQL are connected.':'Our first cricket updates will appear here soon.'}</span></div>}<div className="news-sources"><h3>Follow official updates</h3>{sources.map(s=><a href={s.url} key={s.name} target="_blank" rel="noopener noreferrer"><span><b>{s.name}</b><p>{s.description}</p></span><ArrowUpRight size={17}/></a>)}</div><div className="editorial-box"><span className="eyebrow">THE LENS STANDARD</span><h3>Facts first.<br/>Perspective always.</h3><p>Original stories, clear sources and a closer look at the moments that matter.</p><Link href="/editorial/">Our editorial standards <ArrowUpRight size={15}/></Link></div></aside>
 </div></main>
}
