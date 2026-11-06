import type {MetadataRoute} from 'next';
import {SITE_URL} from '../lib/seo';
export default function robots():MetadataRoute.Robots{const publicIndex=process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true';return {rules:publicIndex?[{userAgent:'*',allow:'/',disallow:['/admin/','/api/']}]:[{userAgent:'*',disallow:'/'}],sitemap:SITE_URL+'/sitemap.xml',host:SITE_URL};}
