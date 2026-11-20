import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {schemas} from '../lib/cms/schema';import {createContentStore} from '../lib/cms/db';import {newsEditorSections} from '../lib/cms/news';import {fillEditorFromSource} from '../lib/cms/editor-source';
const news={title:'News',slug:'news',status:'published',verified:true,summary:'Sidebar summary.',sourceLabel:'Cricbuzz',sourceUrl:'https://www.cricbuzz.com/cricket-news/123/news',seoTitle:'News SEO title',seoDescription:'Search description',socialImage:'https://example.com/share.jpg',description:'Short introduction',series:'Australia cricket',minutes:4,newsSections:[{heading:'The decision',content:'<p><strong>Confirmed fact.</strong></p>',format:'html'},{heading:'What comes next',content:'Second paragraph.',format:'plain'}]};
function adapter(db:any){const q:any=async(s:TemplateStringsArray,...v:any[])=>{let text=s[0];for(let i=0;i<v.length;i++)text+=`$${i+1}`+s[i+1];return(await db.query(text,v)).rows;};q.json=JSON.stringify;q.begin=(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)));return q;}
test('news sections, SEO and introduction survive publishing and section order is retained',async()=>{
 const db=await PGlite.create();try{await db.exec(await readFile('db/001_cms.sql','utf8'));const store=createContentStore(adapter(db));const saved=await store.saveEntry('news',news);const loaded=(await store.listEntries('news',true))[0];assert.deepEqual(loaded.data.newsSections,news.newsSections);for(const k of ['seoTitle','seoDescription','socialImage','description','series','minutes'])assert.equal(loaded.data[k],news[k as keyof typeof news]);assert.equal(loaded.data.summary,news.summary);assert.match(loaded.data.details,/The decision\n\nConfirmed fact/);
 await store.saveEntry('news',{...loaded.data,newsSections:[...loaded.data.newsSections].reverse()},saved.id,saved.revision);assert.equal((await store.listEntries('news',true))[0].data.newsSections[0].heading,'What comes next');
 assert.equal(schemas.news.safeParse({...news,newsSections:[{heading:'Empty',content:'<p></p>',format:'html'}]}).success,false);
 assert.equal(schemas.news.safeParse({...news,socialImage:'javascript:alert(1)'}).success,false);
 }finally{await db.close();}
});
test('older plain/rich news opens as one section and fetching creates source sections without replacing summary or SEO',()=>{
 assert.deepEqual(newsEditorSections({details:'<p>Earlier <strong>content</strong></p>',detailsFormat:'html'}),[{heading:'Story',content:'<p>Earlier <strong>content</strong></p>',format:'html'}]);assert.equal(newsEditorSections({summary:'Legacy summary'})[0].content,'Legacy summary');
 const source={url:news.sourceUrl,publisher:'Cricbuzz',title:'News',fetchedAt:new Date().toISOString(),text:'First.\n\nSecond.',sections:[{heading:'First heading',body:['First.']},{heading:'Second heading',body:['Second.']}],warning:''};
 const filled=fillEditorFromSource('news',news,source);assert.equal(filled.newsSections.length,2);assert.equal(filled.newsSections[1].heading,'Second heading');assert.equal(filled.summary,news.summary);assert.equal(filled.seoTitle,news.seoTitle);assert.equal(filled.verified,false);
});
