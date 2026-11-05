'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowRight,ArrowUpRight,Newspaper} from 'lucide-react';
import type {PublicArticle} from '../lib/cms/public';
type Category=string;
import Art from './Art';
function relativePublishedTime(value?:string|null){if(!value)return '';const t=new Date(value).getTime();if(!Number.isFinite(t))return '';const minutes=Math.floor(Math.max(0,Date.now()-t)/60000);if(minutes<1)return 'Just now';if(minutes<60)return `${minutes} min ago`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours} hr ago`;const days=Math.floor(hours/24);if(days<30)return `${days} ${days===1?'day':'days'} ago`;const months=Math.floor(days/30);if(months<12)return `${months} ${months===1?'month':'months'} ago`;const years=Math.floor(days/365);return `${years} ${years===1?'year':'years'} ago`;}
export default function Home({articles,categories:categoryNames,news=[],sample=true}:{articles:PublicArticle[];categories:string[];news?:any[];sample?:boolean}){
 const categories=['All stories',...categoryNames];
 const params=useSearchParams();
 const fromUrl=params.get('category') as Category;
 const selected=categories.includes(fromUrl)?fromUrl:'All stories';
 const filtered=articles.filter(a=>selected==='All stories'||a.category===selected);
 const [showAll,setShowAll]=useState(false);
 const visible=showAll?filtered:filtered.slice(0,4);
 return <main id="main">
 <div className="publication-grid">
 <aside className="recent-sidebar" aria-labelledby="recent-title"><h2 className="panel-title" id="recent-title">Recent Articles</h2><div className="recent-list">{[...articles].sort((a,b)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime()).slice(0,8).map(a=><Link href={`/articles/${a.slug}/`} key={a.slug}><div><h3>{a.title}</h3><span className="meta" suppressHydrationWarning>{relativePublishedTime(a.createdAt)}</span></div></Link>)}</div><div className="sidebar-about"><span className="eyebrow">OUR PERSPECTIVE</span><p>Beyond the scorecard.<br/>Closer to the story.</p><Link href="/about/">Meet the Lens <ArrowUpRight size={15}/></Link></div></aside>
 <section className="latest-column" id="stories" aria-labelledby="latest-title"><div className="feed-heading"><div><span className="eyebrow">THE LATEST FROM THE LENS</span><h1 id="latest-title">Latest stories</h1></div><span className="feed-count">{filtered.length} stories</span></div>
 <div className="article-feed">{visible.map((a,i)=><article key={a.slug} className={`feed-card ${i===0?'lead-card':''}`}><Link href={`/articles/${a.slug}/`} className="card-art" aria-label={a.title}>{a.imageUrl?<img className="article-cover" src={a.imageUrl} alt={a.imageAlt||''}/>:<Art kind={a.art}/>}<span className="card-arrow"><ArrowUpRight size={20}/></span></Link><div className="feed-copy">{a.label&&<span className="draft-pill">DRAFT</span>}<h2><Link href={`/articles/${a.slug}/`}>{a.title}</Link></h2><p>{a.description}</p><div className="feed-bottom"><div className="meta"><span>{a.author||'The Cricket Lens'}</span><span>{a.minutes} min read</span></div><Link className="read-link" href={`/articles/${a.slug}/`}>Read article <ArrowRight size={15}/></Link></div></div></article>)}</div>
 {!filtered.length&&<div className="empty"><h3>No stories found.</h3><p>No articles are available in this section yet.</p><Link className="text-button" href="/">Show all stories <ArrowRight size={18}/></Link></div>}
 {filtered.length>visible.length&&<button className="load-stories" onClick={()=>setShowAll(true)}>More stories <ArrowRight size={17}/></button>}
 </section>
 <aside className="news-sidebar" aria-labelledby="news-title"><h2 className="panel-title" id="news-title"><Newspaper size={18}/>Cricket News</h2>{news.length?<div className="public-news-list">{news.slice(0,8).map((n:any)=><article key={n.slug}><h3><Link href={`/news/${n.slug}/`}>{n.title}</Link></h3><p>{n.summary}</p><Link className="news-read-more" href={`/news/${n.slug}/`}>Read full story ↗</Link><div><time dateTime={n.publishedAt}>{new Date(n.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</time><a href={n.sourceUrl} target="_blank" rel="noopener noreferrer">{n.sourceLabel} ↗</a></div></article>)}</div>:<div className="news-intro"><span className="news-status">{sample?'NEWS DESK · COMING SOON':'NEWS DESK'}</span><p>Around the cricket world</p><span>{sample?'Verified updates will appear here after the admin and PostgreSQL are connected.':'Our first cricket updates will appear here soon.'}</span></div>}<div className="editorial-box"><span className="eyebrow">THE LENS STANDARD</span><h3>Facts first.<br/>Perspective always.</h3><p>Original stories, clear sources and a closer look at the moments that matter.</p><Link href="/editorial/">Our editorial standards <ArrowUpRight size={15}/></Link></div></aside>
 </div></main>
}
