import {test,before,after} from 'node:test';
import {fillEditorFromSource} from '../lib/cms/editor-source';
import {classifyStory,suggestDraftMetadata} from '../lib/cms/story-suggestions';
import {draftMarkdownTemplate,parseDraftMarkdown} from '../lib/cms/draft-markdown';
import {indexArticleGroups} from '../lib/cms/article-groups';
import {importedArticleContent} from '../lib/cms/draft-markdown';
import {selectRelatedStories} from '../lib/cms/related-stories';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {scryptSync} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {NextRequest} from 'next/server';
import {createContentStore} from '../lib/cms/db';
import {login,validSession,hash,verifyPassword} from '../lib/cms/auth';
import {GET,POST} from '../app/api/admin/[...path]/route';
let engine:PGlite;let sql:any;let store:ReturnType<typeof createContentStore>;let category:any;let author:any;let article:any;let token:string;
// This small tagged-query adapter runs the unchanged repository SQL on PostgreSQL's
// WASM engine in process. It does not mock query results or require network sockets.
function adapter(db:any){const query:any=async(strings:TemplateStringsArray,...values:any[])=>{let text=strings[0];for(let i=0;i<values.length;i++)text+=`$${i+1}`+strings[i+1];return (await db.query(text,values)).rows;};query.json=(v:any)=>JSON.stringify(v);query.begin=(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)));return query;}
const salt='test-only-salt';const origin='http://localhost:4173';
const route=(method:string,path:string,body?:unknown,requestOrigin=origin)=>{const req=new NextRequest(`${origin}/api/admin/${path}`,{method,headers:{...(body?{'content-type':'application/json'}:{}),origin:requestOrigin},...(body?{body:JSON.stringify(body)}:{})});return ({GET,POST} as any)[method](req,{params:Promise.resolve({path:path.split('/')})});};
before(async()=>{engine=await PGlite.create();await engine.exec(await readFile(join(process.cwd(),'db/001_cms.sql'),'utf8'));sql=adapter(engine);store=createContentStore(sql);process.env.DATABASE_URL='postgresql://test-only-unconnected';process.env.ADMIN_EMAIL='editor@example.com';process.env.ADMIN_PASSWORD_HASH=`scrypt:${salt}:${scryptSync('correct-test-password',salt,64).toString('hex')}`;});
after(async()=>{await engine?.close();});
test('PostgreSQL admin publishing lifecycle',async t=>{
 await t.test('API rejects anonymous and cross-site mutations',async()=>{assert.equal((await route('GET','articles')).status,401);assert.equal((await route('POST','login',{email:'editor@example.com',password:'correct-test-password'},'https://bad.example')).status,403);});
 await t.test('password checks and hashed sessions work',async()=>{assert.equal(await login('editor@example.com','wrong-password',()=>sql),null);assert.equal(verifyPassword('anything','broken'),false);token=(await login('editor@example.com','correct-test-password',()=>sql))!;assert.ok(token);assert.equal(await validSession(token,()=>sql),true);const rows=await engine.query<any>('SELECT token_hash FROM cms_sessions');assert.equal(rows.rows[0].token_hash,hash(token));assert.notEqual(rows.rows[0].token_hash,token);});
 await t.test('categories and authors persist',async()=>{category=await store.saveEntry('categories',{title:'Match Reports',slug:'match-reports',status:'published',description:''});author=await store.saveEntry('authors',{title:'Editor',slug:'editor',status:'published',bio:'A cricket writer',role:'Editor',imageUrl:''});assert.equal((await store.listEntries('categories')).length,1);});
 await t.test('drafts save but never appear in public queries',async()=>{article=await store.saveEntry('articles',{title:'Test story',slug:'test-story',status:'draft',description:'An independently written test story.',categoryId:category.id,authorId:author.id,minutes:3,sections:[{heading:'The turning point',body:['Some original analysis.']}],sources:[]});assert.equal((await store.listEntries('articles',true)).length,0);});
 await t.test('publication requires verification and a source',async()=>{await assert.rejects(store.saveEntry('articles',{...article.data,status:'published'},article.id,article.revision));});
 await t.test('publishing retains data and makes it public',async()=>{article=await store.saveEntry('articles',{...article.data,status:'published',verified:true,sources:[{label:'Official source',url:'https://www.icc-cricket.com/'}]},article.id,article.revision);assert.equal(article.revision,2);assert.ok(article.publishedAt);assert.equal((await store.listEntries('articles',true))[0].title,'Test story');});
 await t.test('duplicate slugs and stale revisions are rejected',async()=>{await assert.rejects(store.saveEntry('articles',article.data),{code:'23505'});await assert.rejects(store.saveEntry('articles',{...article.data,title:'Stale title'},article.id,1),/EDIT_CONFLICT/);assert.equal((await store.listEntries('articles'))[0].title,'Test story');});
 await t.test('batch imports force draft status and skip existing slugs on retry',async()=>{
  const publishedSlug=article.slug;
  const newSlug='imported-test-story';
  const result=await store.importArticleDrafts([
   {...article.data,slug:publishedSlug,title:'Do not overwrite'},
   {...article.data,slug:newSlug,scheduledAt:'2028-01-01T00:00:00Z',series:'Test series'},
  ],category.id,author.id);
  assert.deepEqual(result.imported.map(row=>row.slug),[newSlug]);
  assert.deepEqual(result.skipped.map(row=>row.slug),[publishedSlug]);
  const imported=(await store.listEntries('articles')).find(row=>row.slug===newSlug);
  assert.equal(imported?.status,'draft');
  assert.equal(imported?.data.status,'draft');
  assert.equal(imported?.data.scheduledAt,'');
  assert.equal(imported?.data.series,'Test series');
  assert.equal(imported?.data.verified,false);
  assert.equal(imported?.publishedAt,null);
  assert.deepEqual((await store.listEntries('articles',true)).map(row=>row.title),['Test story']);
  assert.deepEqual((await store.importArticleDrafts([imported!.data],category.id,author.id)).imported,[]);
  assert.deepEqual((await store.existingArticleSlugs([newSlug,'missing-slug'])),[newSlug]);
 });
 await t.test('active article references cannot be archived',async()=>{await assert.rejects(store.saveEntry('categories',{...category.data,status:'archived'},category.id,category.revision),/used by articles/);});
 await t.test('markdown updates are atomic and retain the existing article settings',async()=>{
  const [matched]=await store.articleImportMatches([article.slug]);
  const [draft]=parseDraftMarkdown(draftMarkdownTemplate).articles;
  const content=importedArticleContent({...draft,minutes:5});
  await assert.rejects(store.updateImportedArticles([
   {slug:article.slug,revision:matched.revision,content},
   {slug:'missing-article',revision:1,content},
  ]),/EDIT_CONFLICT/);
  const [unchanged]=await store.articleImportMatches([article.slug]);
  assert.equal(unchanged.revision,matched.revision);
  await store.updateImportedArticles([{slug:article.slug,revision:matched.revision,content}]);
  const updated=(await store.listEntries('articles',true)).find(row=>row.slug===article.slug);
  assert.equal(updated?.title,draft.title);
  assert.equal(updated?.data.minutes,5);
  assert.equal(updated?.data.authorId,article.data.authorId);
  assert.equal(updated?.data.imageUrl,article.data.imageUrl);
  assert.equal(updated?.publishedAt,article.publishedAt);
  await store.saveEntry('articles',article.data,article.id,updated?.revision);
  article=(await store.listEntries('articles',true)).find(row=>row.id===article.id)!;
 });
 await t.test('child articles require a main and keep the relationship when the main is archived',async()=>{
  const base={...article.data,status:'draft',verified:false};
  const main=await store.saveEntry('articles',{...base,slug:'group-main',articleRole:'main'});
  const childData={...base,slug:'group-child',articleRole:'child',parentArticleId:main.id,childOrder:2};
  const child=await store.saveEntry('articles',childData);
  assert.equal(child.data.parentArticleId,main.id);
  assert.equal(child.data.childOrder,2);
  await assert.rejects(store.saveEntry('articles',{...childData,parentArticleId:article.id},child.id,child.revision),/saved as a main/);
  await assert.rejects(store.saveEntry('articles',{...childData,parentArticleId:child.id},child.id,child.revision),/different article/);
  await assert.rejects(store.saveEntry('articles',{...main.data,articleRole:'standalone'},main.id,main.revision),/still has child articles/);
  const archived=await store.saveEntry('articles',{...main.data,status:'archived'},main.id,main.revision);
  assert.equal(archived.status,'archived');
  const reloaded=(await store.listEntries('articles')).find(record=>record.id===child.id);
  assert.equal(reloaded?.data.parentArticleId,main.id);
 });
 await t.test('unsafe content URLs and missing authors are rejected',async()=>{await assert.rejects(store.saveEntry('articles',{...article.data,slug:'bad-image',imageUrl:'javascript:alert(1)'}));await assert.rejects(store.saveEntry('articles',{...article.data,slug:'bad-author',authorId:'11111111-1111-4111-8111-111111111111'}),/active category and author/);});
 await t.test('news uses verified publishing workflow',async()=>{const draft=await store.saveEntry('news',{title:'Squad announcement',slug:'squad-announcement',status:'draft',summary:'An official squad update.',sourceLabel:'BCCI',sourceUrl:'https://www.bcci.tv/',team:'India',verified:false});assert.equal((await store.listEntries('news',true)).length,0);await assert.rejects(store.saveEntry('news',{...draft.data,status:'published'},draft.id,draft.revision));await store.saveEntry('news',{...draft.data,status:'published',verified:true},draft.id,draft.revision);assert.equal((await store.listEntries('news',true)).length,1);});
 await t.test('unpublishing removes articles from public results',async()=>{await store.saveEntry('articles',{...article.data,status:'draft'},article.id,article.revision);assert.equal((await store.listEntries('articles',true)).length,0);});
 await t.test('expired sessions are denied and login attempts are throttled',async()=>{await engine.exec("UPDATE cms_sessions SET expires_at=now()-interval '1 second'");assert.equal(await validSession(token,()=>sql),false);for(let i=0;i<10;i++)await login('editor@example.com','wrong',()=>sql);await assert.rejects(login('editor@example.com','wrong',()=>sql),/RATE_LIMIT/);});
});

test('missing admin configuration fails closed even with a session token',async()=>{const saved=process.env.ADMIN_PASSWORD_HASH;try{delete process.env.ADMIN_PASSWORD_HASH;assert.equal(await validSession('a'.repeat(64),()=>{throw new Error('Database should not be queried')}),false);}finally{process.env.ADMIN_PASSWORD_HASH=saved;}});

test('published article groups order child links and keep stories accessible without a published main',()=>{
 const main={id:'main',articleRole:'main' as const};
 const first={id:'first',articleRole:'child' as const,parentArticleId:'main',childOrder:1};
 const second={id:'second',articleRole:'child' as const,parentArticleId:'main',childOrder:2};
 const last={id:'last',articleRole:'child' as const,parentArticleId:'main'};
 const standalone={id:'standalone'};
 const groups=indexArticleGroups([last,second,main,standalone,first]);
 assert.deepEqual(groups.topLevel,[main,standalone]);
 assert.deepEqual(groups.childrenFor(main),[first,second,last]);
 assert.equal(groups.mainFor(first),main);
 assert.deepEqual(indexArticleGroups([standalone,first]).topLevel,[standalone,first]);
});

test('related stories favor group and topic matches and link to distinct stories',()=>{
 const current={slug:'current',series:'A tour',team:'Australia',category:'Analysis',tags:['Test cricket']};
 const sibling={slug:'sibling'};
 const series={slug:'series',series:' a TOUR '};
 const topic={slug:'topic',tags:['TEST CRICKET','test cricket']};
 const team={slug:'team',team:'australia'};
 const category={slug:'category',category:'analysis'};
 const recent={slug:'recent'};
 const filler={slug:'other-recent'};
 assert.deepEqual(
  selectRelatedStories(current,[current,recent,team,category,topic,series,sibling,filler],[current,sibling]).map(story=>story.slug),
  ['sibling','series','topic','team','category','recent'],
 );
 assert.deepEqual(selectRelatedStories({slug:'one'},[{slug:'one'},{slug:'two'}]),[{slug:'two'}]);
});

test('article Markdown imports preserve a series, table slugs, paragraphs and source URLs',()=>{
 const document=draftMarkdownTemplate.replace(
  '# Example Cricket Series',
  '# Example Cricket Series\n\n| Article | Sidebar label | URL slug |\n| --- | --- | --- |\n| 2 | Second story | another-article-slug |',
 );
 const {series,articles}=parseDraftMarkdown(document.replaceAll('\n','\r\n'));
 assert.equal(series,'Example Cricket Series');
 assert.equal(articles.length,2);
 assert.equal(articles[0].slug,'an-original-article-headline');
 assert.equal(articles[1].slug,'another-article-slug');
 assert.equal(articles[0].sections[0].body.length,2);
 assert.deepEqual(articles[0].sources,[{label:'Source name',url:'https://example.com/source'}]);
 assert.throws(()=>parseDraftMarkdown(document.replace('https://','http://')), /HTTPS link/);
});

test('admin authorization requires a verified, allowlisted email',async()=>{const {authorizeUser}=await import('../lib/neon/authorization');const db=await PGlite.create();try{await db.exec("CREATE TABLE cms_admin_authorized (email text primary key, active boolean not null); INSERT INTO cms_admin_authorized VALUES ('admin@example.com',true),('disabled@example.com',false)");const connection=()=>adapter(db) as any;assert.equal(await authorizeUser({email:'ADMIN@example.com',emailVerified:true},connection),true);assert.equal(await authorizeUser({email:'admin@example.com',emailVerified:false},connection),false);assert.equal(await authorizeUser({email:'other@example.com',emailVerified:true},connection),false);assert.equal(await authorizeUser({email:'disabled@example.com',emailVerified:true},connection),false);assert.equal(await authorizeUser(null,connection),false);}finally{await db.close()}});

test('imported story suggestions preserve uncertainty and fit draft field limits',()=>{
 const preview=classifyStory({title:'India name their squad',sourceCategory:'Match Previews'});
 assert.equal(preview.kind,'articles');
 assert.equal(preview.category,'Match Previews');
 assert.equal(classifyStory({title:'Devon Conway ruled out of ODI opener'}).kind,'news');
 assert.equal(classifyStory({title:'A day at the ground',suggestedType:'News'}).kind,'review');
 assert.equal(classifyStory({title:'A day at the ground',url:'https://example.com/features/story'}).kind,'articles');
 assert.deepEqual(suggestDraftMetadata({title:'IPL and T20I update',tags:'India, india | Bowling'}).tags,['India','Bowling']);
 const metadata=suggestDraftMetadata({title:'IPL and T20I update '.repeat(12),summary:'The upcoming fixtures have been confirmed. '.repeat(12)});
 assert.deepEqual(metadata.tags,['IPL','T20I']);
 assert.ok(metadata.seoTitle.length<=70);
 assert.ok(metadata.seoDescription.length<=180);
 assert.equal(suggestDraftMetadata({title:'A day at the ground'}).seoDescription,'A day at the ground');
});

test('source fetch preserves editable sections and suggests an image',()=>{
 const source={
  url:'https://example.com/story',publisher:'Cricket source',title:'Team update',
  fetchedAt:'2026-11-20T00:00:00.000Z',text:'Raw reference for fact checking.',
  sections:[] as {heading:string;body:string[]}[],warning:'',tags:['ODI'],imageUrl:'https://example.com/story.jpg',
 };
 const sections=[
  {heading:'Conway ruled out of the opener',body:['Conway will miss the first ODI.']},
  {heading:'New Zealand consider a replacement',body:['The captain discussed a replacement.','The final XI is pending.']},
 ];
 source.sections=sections;
 const article=fillEditorFromSource('articles',{verified:true,tags:['Existing tag']},source);
 assert.deepEqual(article.sections,sections);
 assert.deepEqual(article.sourceContent,[source]);
 assert.deepEqual(article.tags,['Existing tag']);
 assert.equal(article.sourceImageUrl,source.imageUrl);
 assert.equal(article.imageUrl,undefined);
 assert.equal(article.verified,false);
 const news=fillEditorFromSource('news',{summary:'Existing sidebar summary'},source);
 assert.equal(news.summary,'Existing sidebar summary');
 assert.equal(news.newsSections[1].content,sections[1].body.join('\n\n'));
 assert.ok(news.details.includes(sections[0].heading));
 assert.ok(!news.details.includes(source.text));
 const fallback=fillEditorFromSource('articles',{}, {...source,sections:[]});
 assert.deepEqual(fallback.sections,[{heading:'Source text',body:[source.text]}]);
});
