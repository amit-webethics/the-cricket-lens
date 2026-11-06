import type {Metadata} from 'next';
export const SITE_URL=(process.env.NEXT_PUBLIC_SITE_URL||'https://criclens.fundiffy.com').replace(/\/$/,'');
export function absoluteUrl(path:string){return new URL(path.startsWith('/')?path:'/'+path,SITE_URL).toString();}
export function seoKeywords(item:{seoKeywords?:string|string[];tags?:string[];category?:string;series?:string}):string[]{const raw=Array.isArray(item.seoKeywords)?item.seoKeywords:typeof item.seoKeywords==='string'?item.seoKeywords.split(','):[];return [...new Set([...raw,...(item.tags||[]),item.series||'',item.category||''].map(x=>x.trim()).filter(Boolean))].slice(0,20);}
export function storyMetadata(item:any,path:string,kind:'article'|'news'):Metadata{
 const title=item?.seoTitle?.trim()||item?.title||'Cricket story';
 const description=(item?.seoDescription?.trim()||item?.description||item?.summary||'Cricket news and analysis from The Cricket Lens').replace(/<[^>]*>/g,' ').slice(0,180);
 const image=item?.socialImage||item?.imageUrl;
 const url=absoluteUrl(path);
 const images=image?[{url:image.startsWith('/')?absoluteUrl(image):image,alt:item?.imageAlt||title}]:[];
 return {title,description,keywords:seoKeywords(item),alternates:{canonical:url},openGraph:{type:'article',url,siteName:'The Cricket Lens',title,description,images,publishedTime:item?.publishedAt||undefined,modifiedTime:item?.updatedAt||undefined,authors:[item?.author||'The Cricket Lens']},twitter:{card:images.length?'summary_large_image':'summary',title,description,images:images.map(x=>x.url)},robots:item?.label?{index:false,follow:false}:undefined};
}
export function storyJsonLd(item:any,path:string,kind:'article'|'news'){
 const image=item?.socialImage||item?.imageUrl;
 return {'@context':'https://schema.org','@type':kind==='news'?'NewsArticle':'Article',headline:item.title,description:item.seoDescription||item.description||item.summary||'',mainEntityOfPage:absoluteUrl(path),datePublished:item.publishedAt||undefined,dateModified:item.updatedAt||item.publishedAt||undefined,author:{'@type':'Person',name:item.author||'The Cricket Lens'},publisher:{'@type':'Organization',name:'The Cricket Lens',url:SITE_URL},...(image?{image:[image.startsWith('/')?absoluteUrl(image):image]}:{})};
}
