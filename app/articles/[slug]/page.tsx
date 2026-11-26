import {storyMetadata,storyJsonLd} from '../../../lib/seo';
import DetailRecentSidebar from '../../../components/DetailRecentSidebar';
import ArticleShare from '../../../components/ArticleShare';
import ArticleGroupLinks, {RelatedStories} from '../../../components/ArticleGroupLinks';
import {selectRelatedStories} from '../../../lib/cms/related-stories';
import {indexArticleGroups} from '../../../lib/cms/article-groups';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft, ArrowUpRight} from 'lucide-react';
import {articles} from '../../../lib/articles';
import Art from '../../../components/Art';
import {publicContent} from '../../../lib/cms/public';

export function generateStaticParams(){return articles.map(a=>({slug:a.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const {articles:published}=await publicContent();const item=published.find(a=>a.slug===slug);return item?storyMetadata(item,`/articles/${slug}/`,'article'):{title:'Story not found',robots:{index:false}};}
export default async function Article({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const {articles:published}=await publicContent(); const a=published.find(a=>a.slug===slug); if(!a)notFound();
  const date=a.publishedAt?new Date(a.publishedAt):null;
  const publishedDate=date?new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(date):'';
  const publishedTime=date?new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit',hour12:true}).format(date):'';
  const groups=indexArticleGroups(published);
  const main=groups.mainFor(a)??a;
  const groupStories=[main,...groups.childrenFor(main)].filter(story=>story.slug!==slug);
  const otherStories=groups.topLevel.filter(story=>story.slug!==main.slug);
  const related=selectRelatedStories(a,otherStories,groupStories);
  return <main id="main" className="article-page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(storyJsonLd(a,`/articles/${slug}/`,'article')).replace(/</g,'\\u003c')}}/>
    <Link href="/#stories" className="back-link"><ArrowLeft size={16}/> Back to stories</Link>
    <header className="article-heading">
      <div className="eyebrow"><span>{a.series||a.category}</span>{a.label&&<span className="draft-pill">DRAFT FOR REVIEW</span>}</div>
      <h1>{a.title}</h1>
      <div className="article-meta"><span>by <b>{a.author||'The Cricket Lens'}</b></span>{date&&<><span aria-hidden="true">•</span><time dateTime={a.publishedAt}>Published on {publishedDate} <span aria-hidden="true">•</span> {publishedTime} IST</time></>}<span aria-hidden="true">•</span><span>{a.minutes} min read</span></div>
      <p className="standfirst">{a.description}</p>
      {!a.label&&<ArticleShare slug={a.slug} title={a.title}/>}
    </header>
    <figure className="article-image">{a.imageUrl?<img className="article-cover" src={a.imageUrl} alt={a.imageAlt||''}/>:<Art kind={a.art}/>} {a.imageCredit&&<figcaption>{a.imageCredit.split(/(https?:\/\/[^\s|]+)/g).map((part,i)=>/^https?:\/\//.test(part)?<a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</figcaption>}</figure>
    <div className="article-content-layout">
      <div className="article-body">
        {a.label&&<div className="draft-notice"><b>Editorial draft</b><p>This sample match report is awaiting scorecard verification. It is shown here for design review.</p></div>}
        {a.sections.map((s,i)=><section id={`section-${i}`} key={i}><h2>{s.heading}</h2>{s.body.map((p,n)=><p key={n}>{p}</p>)}</section>)}
        {a.correctionNote&&<div className="draft-notice"><b>Update / correction</b><p>{a.correctionNote}</p><small>Updated {a.updatedAt?new Date(a.updatedAt).toLocaleDateString('en-IN'):''}</small></div>}
        {a.scorecard&&<div className="article-score-action"><Link className="scorecard-link" href={`/scorecards/${a.slug}/`}>View full scorecard <ArrowUpRight size={16}/></Link></div>}
        <div className="article-end">● <span>THE CRICKET LENS</span></div>
        <RelatedStories stories={related} authorBio={a.authorBio}/>
      </div>{groupStories.length>0
        ? <aside className="detail-right-sidebar article-group-sidebar" aria-labelledby="article-group-title">
          <h2 id="article-group-title">{main.series||'Related articles'}</h2>
          <ArticleGroupLinks articles={groupStories}/>
        </aside>
        : <DetailRecentSidebar stories={[...otherStories].sort((a,b)=>new Date(b.publishedAt||b.createdAt||0).getTime()-new Date(a.publishedAt||a.createdAt||0).getTime()).slice(0,6)}/>}
    </div>
  </main>;
}
