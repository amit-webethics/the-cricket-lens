import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {BlockList,isIP} from 'node:net';
import {Readability} from '@mozilla/readability';
import {parseHTML} from 'linkedom';
const hosts=new Set(['espncricinfo.com','www.espncricinfo.com','cricbuzz.com','www.cricbuzz.com','m.cricbuzz.com']);
const MAX_HTML=3_000_000,MAX_TEXT=100_000;
import {sourceReferenceSchema,type SourceReference} from './source-reference';
export function validateSourceUrl(value:string){let u:URL;try{u=new URL(value);}catch{throw new Error('SOURCE_URL');}
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!hosts.has(u.hostname))throw new Error('SOURCE_URL');
 if(u.hostname.includes('cricbuzz')&&!/^\/cricket-news\/\d+(?:\/|$)/.test(u.pathname))throw new Error('SOURCE_URL');
 if(u.hostname.includes('espncricinfo')&&!/^\/(?:story|cricket-news|series)\//.test(u.pathname))throw new Error('SOURCE_URL');
 u.hash='';return u;
}
const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(address,prefix,'ipv4');
const publicV6=new BlockList();publicV6.addSubnet('2000::',3,'ipv6');
const blockedV6=new BlockList();for(const [address,prefix] of [['2001:db8::',32],['2001::',32],['2002::',16]] as const)blockedV6.addSubnet(address,prefix,'ipv6');
export function isPublicAddress(address:string){return isIP(address)===4?!blocked.check(address,'ipv4'):isIP(address)===6&&publicV6.check(address,'ipv6')&&!blockedV6.check(address,'ipv6');}
export type PageResponse={status:number;location?:string;contentType:string;html:string};
async function requestPage(url:URL,signal:AbortSignal):Promise<PageResponse>{
 const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new Error('SOURCE_ADDRESS');
 const selected=addresses[0];
 return new Promise((resolve,reject)=>{
  const req=request(url,{method:'GET',signal,family:selected.family,headers:{'User-Agent':'CricketLensEditorialReader/1.0','Accept':'text/html','Accept-Encoding':'identity'},lookup:(_host,_options,callback)=>{if('all' in _options&&_options.all)(callback as any)(null,[selected]);else callback(null,selected.address,selected.family);}},res=>{
   const status=res.statusCode||500;
   if(status>=300&&status<400){res.resume();resolve({status,location:res.headers.location,contentType:'',html:''});return;}
   if(status!==200){res.resume();resolve({status,contentType:'',html:''});return;}
   if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(new Error('SOURCE_ENCODING'));return;}
   const chunks:Buffer[]=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>MAX_HTML){res.destroy(new Error('SOURCE_SIZE'));return;}chunks.push(Buffer.from(chunk));});
   res.on('error',reject);res.on('end',()=>resolve({status,contentType:String(res.headers['content-type']||''),html:Buffer.concat(chunks).toString('utf8')}));
  });req.on('error',reject);req.setTimeout(15000,()=>req.destroy(new Error('SOURCE_TIMEOUT')));req.end();
 });
}
const clean=(s:string)=>(s||'').replace(/\s+/g,' ').trim();
export function extractSource(html:string,url:string):SourceReference{
 const u=validateSourceUrl(url);const {document}=parseHTML(html);
 if(document.querySelector('[data-paywall],.paywall-content,.subscription-required')||/"isAccessibleForFree"\s*:\s*(?:false|"false")/i.test(html))throw new Error('SOURCE_RESTRICTED');
 const jsonBodies:string[]=[];let jsonTitle='';
 function walk(value:any){if(Array.isArray(value)){value.forEach(walk);return;}if(!value||typeof value!=='object')return;
  if(value.articleBody&&typeof value.articleBody==='string'){jsonBodies.push(value.articleBody);if(typeof value.headline==='string')jsonTitle=value.headline;}
  Object.values(value).forEach(v=>{if(v&&typeof v==='object')walk(v);});
 }
 for(const script of document.querySelectorAll('script[type="application/ld+json"]')){try{walk(JSON.parse(script.textContent||''));}catch{}}
 const title=clean(jsonTitle||document.querySelector('meta[property="og:title"]')?.getAttribute('content')||document.querySelector('h1')?.textContent||document.title).slice(0,220);
 document.querySelectorAll('script,style,nav,footer,header,aside,form,iframe,noscript,button,[hidden],[aria-hidden="true"]').forEach(e=>e.remove());
 let content='';
 const exact=document.querySelector('[itemprop="articleBody"],.cb-nws-artcl-content,.cb-nws-dtl-itms');
 if(exact)content=exact.outerHTML;
 else{const article=new Readability(document.cloneNode(true) as unknown as Document,{charThreshold:200,maxElemsToParse:40000}).parse();content=article?.content||'';}
 const jsonBody=jsonBodies.sort((a,b)=>b.length-a.length)[0]||'';
 const visibleText=clean(parseHTML(`<html><body>${content}</body></html>`).document.body.textContent||'');
 if(clean(jsonBody).length>visibleText.length)content=jsonBody;
 const body=parseHTML(`<html><body>${content.includes('<')?content:content.split(/\n+/).map(p=>`<p>${p.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`).join('')}</body></html>`).document;
 const sections:{heading:string;body:string[]}[]=[];let current={heading:'Story',body:[] as string[]};
 for(const node of body.querySelectorAll('h2,h3,p,.cb-nws-artcl-para')){const text=clean(node.textContent||'');if(!text)continue;if(node.classList.contains('cb-nws-artcl-para')&&node.querySelector('p'))continue;
  if(/^H[23]$/.test(node.tagName)){if(current.body.length)sections.push(current);current={heading:text.slice(0,200),body:[]};}
  else if(!/^(advertisement|related stories|also read|read more|follow us)\b/i.test(text))current.body.push(text);
 }
 if(current.body.length)sections.push(current);
 if(!sections.length){const text=clean(body.body?.textContent||body.documentElement?.textContent||'');if(text)sections.push({heading:'Story',body:[text]});}
 const full=sections.map(s=>s.body.join('\n\n')).join('\n\n');
 if(full.length<200||/^(access denied|just a moment|verify you are human|enable javascript)/i.test(full))throw new Error('SOURCE_UNAVAILABLE');
 let budget=MAX_TEXT;let truncated=sections.length>50;
 const bounded=sections.slice(0,50).map(s=>({...s,body:s.body.slice(0,100).map(p=>{const text=p.slice(0,Math.max(0,Math.min(20000,budget)));if(text.length<p.length)truncated=true;budget-=text.length+2;return text;}).filter(Boolean)})).filter(s=>s.body.length);
 const text=bounded.map(s=>s.body.join('\n\n')).join('\n\n').slice(0,MAX_TEXT);
 return sourceReferenceSchema.parse({url:u.toString(),publisher:u.hostname.includes('cricbuzz')?'Cricbuzz':'ESPNcricinfo',title,fetchedAt:new Date().toISOString(),text,sections:bounded,warning:truncated?'This source exceeded the extraction limit. Open the original for the remaining text.':'Extraction may omit tables, embedded media or dynamically loaded content. Check the source for completeness.'});
}
export async function fetchSourceContent(value:string,loader:(url:URL,signal:AbortSignal)=>Promise<PageResponse>=requestPage){
 let url=validateSourceUrl(value);const signal=AbortSignal.timeout(25000);
 for(let redirects=0;redirects<=3;redirects++){
  const page=await loader(url,signal);
  if(page.status>=300&&page.status<400){if(!page.location||redirects===3)throw new Error('SOURCE_REDIRECT');url=validateSourceUrl(new URL(page.location,url).toString());continue;}
  if(page.status===401||page.status===403)throw new Error('SOURCE_RESTRICTED');
  if(page.status!==200)throw new Error('SOURCE_UNAVAILABLE');
  if(!/text\/html|application\/xhtml\+xml/i.test(page.contentType))throw new Error('SOURCE_TYPE');
  if(Buffer.byteLength(page.html)>MAX_HTML)throw new Error('SOURCE_SIZE');
  return extractSource(page.html,url.toString());
 }
 throw new Error('SOURCE_REDIRECT');
}
export function sourceErrorMessage(code:string){
 if(code==='SOURCE_URL')return 'Use an HTTPS ESPNcricinfo or Cricbuzz article URL.';
 if(code==='SOURCE_RESTRICTED')return 'This source requires access or blocked the request. Open it directly and add the facts you can access to your section notes.';
 if(code==='SOURCE_SIZE')return 'This source is too large to fetch. Open it directly and add the relevant facts to your notes.';
 return 'Could not extract the article text. The page may be unavailable or require JavaScript. Open the source directly and try again later.';
}
