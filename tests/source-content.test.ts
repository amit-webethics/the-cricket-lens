import {test} from 'node:test';import assert from 'node:assert/strict';
import {extractSource,fetchSourceContent,isPublicAddress,validateSourceUrl} from '../lib/cms/source-content';
import {generateSection} from '../lib/cms/drafting';
import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import {createContentStore} from '../lib/cms/db';
const url='https://www.cricbuzz.com/cricket-news/123/india-squad';
const first='India announced their squad for the forthcoming series. The selectors retained the core group and brought back two players following their recovery. The team will assemble before the opening match to complete preparations.';
const second='The coaching staff will review conditions before settling the final combination. The selected players will have an opportunity to prepare together, with further details to be confirmed through the official announcement.';
const html=`<html><head><title>India squad</title></head><body><nav>navigation noise</nav><article itemprop="articleBody"><p>${first}</p><h2>Selection changes</h2><p>${second}</p><script>untrusted script text</script></article><footer>footer noise</footer></body></html>`;
test('source URLs, private DNS addresses and redirect targets are rejected',async()=>{
 for(const bad of ['http://www.cricbuzz.com/cricket-news/1/story','https://www.cricbuzz.com.evil.test/cricket-news/1/story','https://user:pass@www.cricbuzz.com/cricket-news/1/story','https://127.0.0.1/story','https://www.cricbuzz.com:444/cricket-news/1/story','https://www.cricbuzz.com/cricket-news'])assert.throws(()=>validateSourceUrl(bad));
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','::ffff:127.0.0.1','2001:db8::1'])assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('8.8.8.8'),true);
 let calls=0;await assert.rejects(fetchSourceContent(url,async()=>{calls++;return {status:302,location:'https://127.0.0.1/private',html:'',contentType:''};}),/SOURCE_URL/);assert.equal(calls,1);
 await assert.rejects(fetchSourceContent(url,async()=>({status:200,contentType:'application/json',html:'{}'})),/SOURCE_TYPE/);
 await assert.rejects(fetchSourceContent(url,async()=>({status:403,contentType:'text/html',html:''})),/SOURCE_RESTRICTED/);
});
test('extracts labelled source sections, strips page chrome and handles JSON-LD',()=>{
 const ref=extractSource(html,url);assert.equal(ref.publisher,'Cricbuzz');assert.equal(ref.sections.length,2);assert.equal(ref.sections[1].heading,'Selection changes');assert.match(ref.text,/selectors retained/);assert.doesNotMatch(ref.text,/navigation noise|footer noise|untrusted script/);
 const ld=`<html><head><script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',headline:'Selection news',articleBody:first+'\n\n'+second})}</script></head><body></body></html>`;
 assert.equal(extractSource(ld,'https://www.espncricinfo.com/story/india-selection-123').publisher,'ESPNcricinfo');
 assert.throws(()=>extractSource('<article><p>Short teaser</p></article>',url),/SOURCE_UNAVAILABLE/);
 assert.throws(()=>extractSource('<script type="application/ld+json">{"isAccessibleForFree":false}</script>'+html,url),/SOURCE_RESTRICTED/);
});
test('readability fallback and extraction caps retain only bounded article text',()=>{
 const ref=extractSource(html.replace(' itemprop="articleBody"',''),url);assert.match(ref.text,/selectors retained/);
 const huge=extractSource(`<html><body><article itemprop="articleBody">${Array.from({length:100},()=>`<p>${first.repeat(20)}</p>`).join('')}</article></body></html>`,url);
 assert.ok(huge.text.length<=100000);assert.match(huge.warning,/extraction limit/);assert.ok(huge.sections[0].body.every(p=>p.length<=20000));
});
test('AI regeneration receives fetched text and validates the news summary limit',async()=>{
 process.env.AI_GATEWAY_API_KEY='test';process.env.AI_DRAFT_MODEL='test/model';let seen:any;
 const raw={kind:'news' as const,mode:'regenerate' as const,title:'India squad',description:'',heading:'News summary',currentText:'Current summary',notes:'Focus on the changes',otherHeadings:[],sourceContent:[extractSource(html,url)]};
 const fake=async(options:any)=>{seen=options;return {output:{draft:'The selectors retained their core group while recalling two players.',factsToCheck:[]}};};
 const result=await generateSection(raw,[],fake as any);assert.match(result.draft,/selectors/);const prompt=JSON.parse(seen.prompt);assert.equal(prompt.mode,'regenerate');assert.match(prompt.sourceText[0].text,/coaching staff/);
 await assert.rejects(generateSection(raw,[],(async()=>({output:{draft:'x'.repeat(1201),factsToCheck:[]}})) as any),/DRAFT_INVALID_RESPONSE/);
});
function adapter(db:any){const q:any=async(s:TemplateStringsArray,...v:any[])=>{let text=s[0];for(let i=0;i<v.length;i++)text+=`$${i+1}`+s[i+1];return(await db.query(text,v)).rows;};q.json=JSON.stringify;q.begin=(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)));return q;}
test('source content persists privately and is excluded from public records',async()=>{
 const db=await PGlite.create();try{await db.exec(await readFile('db/001_cms.sql','utf8'));const store=createContentStore(adapter(db));
 await store.saveEntry('news',{title:'India squad',slug:'india-squad',status:'published',summary:'Selection update',sourceLabel:'Cricbuzz',sourceUrl:url,verified:true,sourceContent:[extractSource(html,url)]});
 assert.equal((await store.listEntries('news'))[0].data.sourceContent[0].text.includes('selectors'),true);
 assert.equal('sourceContent' in (await store.listEntries('news',true))[0].data,false);
 }finally{await db.close();}
});

 test('accepts legacy ESPN RSS article URLs, Cricinfo aliases and their approved redirects',async()=>{
 const legacy='https://www.espncricinfo.com/ci/content/story/123456.html?ex_cid=OTC-RSS#top';
 assert.equal(validateSourceUrl(legacy).pathname,'/ci/content/story/123456.html');
 assert.equal(validateSourceUrl('https://www.cricinfo.com/ci/content/story/123456.html').hostname,'www.cricinfo.com');
 assert.equal(validateSourceUrl('https://m.espncricinfo.com/ci/content/current/123456.html').hostname,'m.espncricinfo.com');
 const calls:string[]=[];const result=await fetchSourceContent(legacy,async(u)=>{calls.push(u.toString());return calls.length===1?{status:301,location:'https://www.espncricinfo.com/story/india-squad-123456',contentType:'',html:''}:{status:200,contentType:'text/html',html};});
 assert.equal(calls.length,2);assert.equal(result.publisher,'ESPNcricinfo');assert.match(result.text,/selectors retained/);
 for(const invalid of ['https://www.espncricinfo.com/ci/content/player/123456.html','https://www.cricinfo.com.evil.test/ci/content/story/123456.html','https://www.espncricinfo.com/ci/content/story/not-an-id.html'])assert.throws(()=>validateSourceUrl(invalid));
 });
