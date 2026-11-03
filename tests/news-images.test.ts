import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {schemas} from '../lib/cms/schema';
import {createContentStore} from '../lib/cms/db';
const news={title:'Maxwell retires',slug:'maxwell-retires',status:'published',verified:true,summary:'A career retrospective.',details:'Full news story.',sourceLabel:'Cricbuzz',sourceUrl:'https://www.cricbuzz.com/cricket-news/140769/glenn-maxwell-retires-from-international-cricket'};
const image={imageUrl:'/api/media/2395f3df-cc5e-4e6a-bbf6-176ec0a0a031',imageAlt:'Glenn Maxwell batting for Australia in 2018. File photo.',imageCredit:'David Molloy / CC BY 2.0',imageRightsConfirmed:true};
test('news allows optional images and checks alt text, URLs and permission when publishing',()=>{
 assert.equal(schemas.news.parse(news).imageUrl,'');
 assert.deepEqual(Object.fromEntries(Object.keys(image).map(k=>[k,schemas.news.parse({...news,...image})[k as keyof typeof image]])),image);
 for(const invalid of [{imageAlt:''},{imageRightsConfirmed:false},{imageUrl:'javascript:alert(1)'}])assert.equal(schemas.news.safeParse({...news,...image,...invalid}).success,false);
 assert.equal(schemas.news.safeParse({...news,...image,status:'draft',imageAlt:'',imageRightsConfirmed:false}).success,true);
});
function adapter(db:any){const q:any=async(s:TemplateStringsArray,...v:any[])=>{let text=s[0];for(let i=0;i<v.length;i++)text+=`$${i+1}`+s[i+1];return(await db.query(text,v)).rows;};q.json=JSON.stringify;q.begin=(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)));return q;}
test('news cover survives save and reload and is included in published content; removal clears it',async()=>{
 const db=await PGlite.create();try{await db.exec(await readFile('db/001_cms.sql','utf8'));const store=createContentStore(adapter(db));
 const entry=await store.saveEntry('news',{...news,...image});
 for(const publicOnly of [false,true]){const loaded=(await store.listEntries('news',publicOnly))[0];for(const [key,value]of Object.entries(image))assert.equal(loaded.data[key],value);}
 await store.saveEntry('news',{...entry.data,imageUrl:'',imageAlt:'',imageCredit:'',imageRightsConfirmed:false},entry.id,entry.revision);
 assert.equal((await store.listEntries('news',true))[0].data.imageUrl,'');
 }finally{await db.close();}
});
