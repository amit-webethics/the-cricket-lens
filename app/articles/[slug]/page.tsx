import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft, ArrowUpRight} from 'lucide-react';
import {articles} from '../../../lib/articles';
import Art from '../../../components/Art';
import {publicContent} from '../../../lib/cms/public';

export function generateStaticParams(){return articles.map(a=>({slug:a.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params; const {articles:published}=await publicContent(); const a=published.find(a=>a.slug===slug);
  return {title:a?.seoTitle||a?.title||'Story not found',description:a?.seoDescription||a?.description,openGraph:{title:a?.seoTitle||a?.title,description:a?.seoDescription||a?.description,images:a?.socialImage?[a.socialImage]:a?.imageUrl?[a.imageUrl]:[]}};
}
export default async function Article({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const {articles:published}=await publicContent(); const a=published.find(a=>a.slug===slug); if(!a)notFound();
  const related=published.filter(x=>x.slug!==slug).slice(0,2);
  return <main id="main" className="article-page">
    <Link href="/#stories" className="back-link"><ArrowLeft size={16}/> Back to stories</Link>
    <header className="article-heading">
      <div className="eyebrow"><span>{a.category}</span>{a.label&&<span className="draft-pill">DRAFT FOR REVIEW</span>}</div>
      <h1>{a.title}</h1><p className="standfirst">{a.description}</p>
      <div className="byline"><span className="author-avatar" aria-hidden="true">L<span>●</span></span><div><b>{a.author||'The Cricket Lens'}</b><span>{a.authorRole||'Editorial desk'} · {a.minutes} min read</span></div>{a.publishedAt&&<time className="article-date" dateTime={a.publishedAt}>{new Date(a.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</time>}</div>
    </header>
    <figure className="article-image">{a.imageUrl?<img className="article-cover" src={a.imageUrl} alt={a.imageAlt||''}/>:<Art kind={a.art}/>} {a.imageCredit&&<figcaption>{a.imageCredit.split(/(https?:\/\/[^\s|]+)/g).map((part,i)=>/^https?:\/\//.test(part)?<a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</figcaption>}</figure>
    <div className="article-content-layout">
      <aside aria-label="In this story"><span className="eyebrow muted">IN THIS STORY</span>{a.sections.map((s,i)=><a href={`#section-${i}`} key={i}><span>{String(i+1).padStart(2,'0')}</span>{s.heading}</a>)}<div className="aside-note">The game.<br/>The stories.<br/><em>Our perspective.</em></div></aside>
      <div className="article-body">
        {a.label&&<div className="draft-notice"><b>Editorial draft</b><p>This sample match report is awaiting scorecard verification. It is shown here for design review.</p></div>}
        {a.sections.map((s,i)=><section id={`section-${i}`} key={i}><h2>{s.heading}</h2>{s.body.map((p,n)=><p key={n}>{p}</p>)}</section>)}
        {a.correctionNote&&<div className="draft-notice"><b>Update / correction</b><p>{a.correctionNote}</p><small>Updated {a.updatedAt?new Date(a.updatedAt).toLocaleDateString('en-IN'):''}</small></div>}
        <div className="article-end">● <span>THE CRICKET LENS</span></div>
        <div className="source-note"><b>{a.label?'Source verification':'Sources & notes'}</b>{a.label&&<p>Prepared from the match notes supplied for this preview. An authoritative scorecard and source links must be added before publication.</p>}{a.sources?.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a></p>)}{a.authorBio&&<p>{a.authorBio}</p>}<Link href="/editorial/">Read our editorial standards ↗</Link></div>
      </div>
    </div>
    {related.length>0&&<section className="related"><div className="section-heading"><h2>Keep looking closer.</h2><Link href="/#stories">All stories <ArrowUpRight size={18}/></Link></div><div className="related-grid">{related.map(x=><Link key={x.slug} href={`/articles/${x.slug}/`}>{x.imageUrl?<img className="related-cover" src={x.imageUrl} alt={x.imageAlt||''}/>:<Art kind={x.art}/>}<div><span className="card-category">{x.category}</span><h3>{x.title}</h3><span className="muted">{x.minutes} min read ↗</span></div></Link>)}</div></section>}
  </main>;
}
