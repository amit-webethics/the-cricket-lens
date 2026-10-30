import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createCollectedStore,normalizeStory,suggestSection,sourceUrl,webhookAuthorized,importApifyRun} from '../lib/cms/collected';
import {createContentStore} from '../lib/cms/db';
function adapter(db:any){const q:any=async(s:TemplateStringsArray,...v:any[])=>{let text=s[0];for(let i=0;i<v.length;i++)text+=`$${i+1}`+s[i+1];return(await db.query(text,v)).rows;};q.json=JSON.stringify;q.begin=(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)));return q;}
const raw={'Original headline':'Squad announced','Source':'Test','Source URL':'https://example.com/story?utm_source=test','Feed summary (source text)':'Source summary','Suggested type':'News'};
test('metadata routing and unknowns',()=>{
 assert.equal(suggestSection('A headline','Match Preview','News').category,'Match Previews');
 assert.equal(suggestSection('A headline','Player Analysis','News').category,'Player Analysis');
 assert.equal(suggestSection('A headline','','News').kind,'review');
 assert.equal(suggestSection('A headline','news','Preview').kind,'news');
 assert.equal(suggestSection('Match review','','News').category,'Match Reports');
 assert.equal(suggestSection('Opinion on selection','','News').category,'Opinions & Explainers');
 assert.equal(sourceUrl('https://example.com/story?utm_source=test#top'),'https://example.com/story');
 assert.throws(()=>normalizeStory({...raw,'Source URL':'javascript:alert(1)'},'run'));
});
test('idempotent imports and draft conversion preserve editorial changes',async()=>{
 const db=await PGlite.create();try{
 await db.exec(await readFile('db/001_cms.sql','utf8'));await db.exec(await readFile('db/003_collected.sql','utf8'));
 const sql=adapter(db),store=createCollectedStore(sql),cms=createContentStore(sql);
 const first=await store.importRows([raw,{'Original headline':'Invalid'}],'run-one');assert.deepEqual(first,{inserted:1,duplicates:0,invalid:1,total:2});
 const [{id}]=await store.list();const entry=await store.convert(id,{kind:'news'});
 assert.equal((await cms.listEntries('news',true)).length,0);
 const [draft]=await cms.listEntries('news');await cms.saveEntry('news',{...draft.data,title:'My edited headline'},draft.id,draft.revision);
 assert.equal((await store.importRows([{...raw,'Original headline':'Source changed','Source URL':'https://example.com/story'}],'run-two')).duplicates,1);
 assert.equal((await cms.listEntries('news'))[0].title,'My edited headline');assert.equal((await store.convert(id,{kind:'articles'})).id,entry.id);
 const category=await cms.saveEntry('categories',{title:'Match Reports',slug:'match-reports',status:'published'}),author=await cms.saveEntry('authors',{title:'Desk',slug:'desk',status:'published'});
 await store.importRows([{...raw,'Source URL':'https://example.com/report','Source tags':'Match Report'}],'run-three');
 const report=(await store.list()).find((x:any)=>x.data.url.endsWith('/report'))!;
 await store.convert(report.id,{kind:'articles',categoryId:category.id,authorId:author.id});
 assert.equal((await cms.listEntries('articles',true)).length,0);assert.equal((await cms.listEntries('articles'))[0].data.categoryId,category.id);
 }finally{await db.close();}
});
test('webhook fails closed and API checks Actor identity',async()=>{
 process.env.APIFY_WEBHOOK_SECRET='x'.repeat(32);assert.equal(webhookAuthorized(null),false);assert.equal(webhookAuthorized('Bearer wrong'),false);assert.equal(webhookAuthorized('Bearer '+'x'.repeat(32)),true);
 process.env.APIFY_API_TOKEN='test';process.env.APIFY_ACTOR_ID='expected';
 const fetcher=async()=>new Response(JSON.stringify({data:{actId:'other',status:'SUCCEEDED',defaultDatasetId:'dataset'}}));
 await assert.rejects(importApifyRun('1234567890',fetcher as any,{} as any),/configured collector/);
 const calls:string[]=[];const okFetch=async(url:any)=>{calls.push(String(url));return new Response(JSON.stringify(calls.length===1?{data:{actId:'expected',status:'SUCCEEDED',defaultDatasetId:'dataset'}}:[raw]));};
 const store={importRows:async(rows:any[],runId:string)=>({count:rows.length,runId})};
 assert.deepEqual(await importApifyRun('1234567890',okFetch as any,store as any),{count:1,runId:'1234567890'});
 assert.equal(calls.length,2);
});
