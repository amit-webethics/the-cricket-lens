import {test,before,after} from 'node:test';
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
 await t.test('active article references cannot be archived',async()=>{await assert.rejects(store.saveEntry('categories',{...category.data,status:'archived'},category.id,category.revision),/used by articles/);});
 await t.test('unsafe content URLs and missing authors are rejected',async()=>{await assert.rejects(store.saveEntry('articles',{...article.data,slug:'bad-image',imageUrl:'javascript:alert(1)'}));await assert.rejects(store.saveEntry('articles',{...article.data,slug:'bad-author',authorId:'11111111-1111-4111-8111-111111111111'}),/active category and author/);});
 await t.test('news uses verified publishing workflow',async()=>{const draft=await store.saveEntry('news',{title:'Squad announcement',slug:'squad-announcement',status:'draft',summary:'An official squad update.',sourceLabel:'BCCI',sourceUrl:'https://www.bcci.tv/',team:'India',verified:false});assert.equal((await store.listEntries('news',true)).length,0);await assert.rejects(store.saveEntry('news',{...draft.data,status:'published'},draft.id,draft.revision));await store.saveEntry('news',{...draft.data,status:'published',verified:true},draft.id,draft.revision);assert.equal((await store.listEntries('news',true)).length,1);});
 await t.test('unpublishing removes articles from public results',async()=>{await store.saveEntry('articles',{...article.data,status:'draft'},article.id,article.revision);assert.equal((await store.listEntries('articles',true)).length,0);});
 await t.test('expired sessions are denied and login attempts are throttled',async()=>{await engine.exec("UPDATE cms_sessions SET expires_at=now()-interval '1 second'");assert.equal(await validSession(token,()=>sql),false);for(let i=0;i<10;i++)await login('editor@example.com','wrong',()=>sql);await assert.rejects(login('editor@example.com','wrong',()=>sql),/RATE_LIMIT/);});
});

test('missing admin configuration fails closed even with a session token',async()=>{const saved=process.env.ADMIN_PASSWORD_HASH;try{delete process.env.ADMIN_PASSWORD_HASH;assert.equal(await validSession('a'.repeat(64),()=>{throw new Error('Database should not be queried')}),false);}finally{process.env.ADMIN_PASSWORD_HASH=saved;}});
