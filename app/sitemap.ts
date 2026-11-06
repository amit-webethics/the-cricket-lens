import type {MetadataRoute} from 'next';
import {publicContent} from '../lib/cms/public';
import {absoluteUrl} from '../lib/seo';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const staticRoutes=['/','/about/','/contact/','/privacy/','/terms/','/editorial/','/corrections/','/ipl/','/records/'];
 const result:MetadataRoute.Sitemap=staticRoutes.map(path=>({url:absoluteUrl(path),changeFrequency:path==='/'?'daily':'monthly',priority:path==='/'?1:0.6}));
 try{const {articles,news}=await publicContent();for(const a of articles){if(a.slug&&!a.label)result.push({url:absoluteUrl('/articles/'+a.slug+'/'),lastModified:a.updatedAt||a.publishedAt||undefined,changeFrequency:'weekly',priority:0.8});}for(const n of news){if(n.slug)result.push({url:absoluteUrl('/news/'+n.slug+'/'),lastModified:n.updatedAt||n.publishedAt||undefined,changeFrequency:'daily',priority:0.8});}}catch{}
 return result;
}
