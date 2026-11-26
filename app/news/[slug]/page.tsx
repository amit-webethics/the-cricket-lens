import {storyMetadata,storyJsonLd} from '../../../lib/seo';
import DetailRecentSidebar from '../../../components/DetailRecentSidebar';
import {RelatedStories} from '../../../components/ArticleGroupLinks';
import {selectRelatedStories} from '../../../lib/cms/related-stories';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft} from 'lucide-react';
import Art from '../../../components/Art';
import {publicContent} from '../../../lib/cms/public';
import {newsEditorSections} from '../../../lib/cms/news';
import {newsDetailsHtml} from '../../../lib/cms/rich-text';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const {news}=await publicContent();const item=news.find(n=>n.slug===slug);return item?storyMetadata(item,`/news/${slug}/`,'news'):{title:'News not found',robots:{index:false}};}
export default async function NewsPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const {news}=await publicContent();const item=news.find(n=>n.slug===slug);if(!item)notFound();const sections=newsEditorSections(item);const related=selectRelatedStories(item,news);const date=item.publishedAt?new Date(item.publishedAt):null;
 const publishedDate=date?new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(date):'';const publishedTime=date?new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit',hour12:true}).format(date):'';
 return <main id="main" className="article-page news-detail-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(storyJsonLd(item,`/news/${slug}/`,'news')).replace(/</g,'\\u003c')}}/><Link className="back-link" href="/#news-title"><ArrowLeft size={16}/> Back to cricket news</Link><header className="article-heading"><div className="eyebrow"><span>{item.series||item.team||item.category||'Cricket news'}</span></div><h1>{item.title}</h1><div className="article-meta"><span>by <b>{item.author||'The Cricket Lens'}</b></span>{date&&<><span aria-hidden="true">•</span><time dateTime={item.publishedAt}>Published on {publishedDate} <span aria-hidden="true">•</span> {publishedTime} IST</time></>}<span aria-hidden="true">•</span><span>{item.minutes||3} min read</span></div><p className="standfirst">{item.description||item.summary}</p></header>
 <figure className="article-image">{item.imageUrl?<img className="article-cover" src={item.imageUrl} alt={item.imageAlt||''}/>:<Art kind="stadium"/>}{item.imageCredit&&<figcaption>{item.imageCredit.split(/(https?:\/\/[^\s|]+)/g).map((part:string,i:number)=>/^https?:\/\//.test(part)?<a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</figcaption>}</figure>
 <div className="article-content-layout"><div className="article-body">{sections.map((s,i)=><section id={`section-${i}`} key={i}><h2>{s.heading}</h2><div className="news-formatted-content" dangerouslySetInnerHTML={{__html:newsDetailsHtml(s.content,s.format)}}/></section>)}{item.correctionNote&&<div className="draft-notice"><b>Update / correction</b><p>{item.correctionNote}</p>{item.updatedAt&&<small>Updated {new Date(item.updatedAt).toLocaleDateString('en-IN')}</small>}</div>}<div className="article-end">● <span>THE CRICKET LENS</span></div><RelatedStories stories={related} kind="news" authorBio={item.authorBio}/></div><DetailRecentSidebar kind="news" stories={news.filter(n=>n.slug!==slug).sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime()).slice(0,6)}/></div>
 </main>;
}
