import React,{act} from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {SearchParamsContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import Editor from '../components/admin/Editor';
test('news editor selects a media image with its credit, saves it, previews it and removes it',async()=>{
 const {window}=parseHTML('<html><body></body></html>');Object.assign(globalThis,{window,self:window,document:window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const {createRoot}=await import('react-dom/client');const container=window.document.createElement('div');window.document.body.append(container);const root=createRoot(container);const originalFetch=globalThis.fetch;let saved:any;
 const media={id:'2395f3df-cc5e-4e6a-bbf6-176ec0a0a031',filename:'maxwell-batting.jpg',alt:'Maxwell batting, file photo.',credit:'David Molloy / CC BY 2.0'};
 const entry={id:'news-1',revision:1,data:{title:'Maxwell retires',slug:'maxwell-retires',status:'draft',summary:'News summary.',details:'Full story.',sourceLabel:'Cricbuzz',sourceUrl:'https://www.cricbuzz.com/cricket-news/140769/update',sources:[],verified:false}};
 globalThis.fetch=(async(url:any,options:any)=>{if(options?.method==='PUT'){saved=JSON.parse(options.body);return new Response(JSON.stringify({item:{...entry,data:saved,revision:2}}));}return new Response(JSON.stringify({items:String(url).endsWith('/news')?[entry]:String(url).endsWith('/media')?[media]:[]}));}) as any;
 const click=async(name:string)=>{const b=[...container.querySelectorAll('button')].find(b=>b.textContent===name);assert.ok(b,name);await act(async()=>{b.dispatchEvent(new window.Event('click',{bubbles:true}));});};
 try{await act(async()=>{root.render(<AppRouterContext.Provider value={{replace(){},push(){},prefetch(){}} as any}><SearchParamsContext.Provider value={new URLSearchParams('id=news-1')}><Editor kind="news"/></SearchParamsContext.Provider></AppRouterContext.Provider>);});
 assert.match(container.textContent||'',/Cover image/);await click('Choose from media library');await click(media.filename);
 assert.equal(container.querySelector('img.admin-upload-preview')?.getAttribute('src'),`/api/media/${media.id}`);assert.ok([...container.querySelectorAll('input')].some(i=>i.value===media.credit));
 await act(async()=>{container.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});assert.equal(saved.imageUrl,`/api/media/${media.id}`);assert.equal(saved.imageAlt,media.alt);assert.equal(saved.imageCredit,media.credit);
 await click('Preview');assert.equal(container.querySelector('.admin-preview figure img')?.getAttribute('alt'),media.alt);await act(async()=>{container.querySelector('[aria-label="Close preview"]')!.dispatchEvent(new window.Event('click',{bubbles:true}));});
 await click('Remove image');await act(async()=>{container.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});assert.equal(saved.imageUrl,'');assert.equal(saved.imageCredit,'');
 }finally{await act(async()=>root.unmount());globalThis.fetch=originalFetch;delete (globalThis as any).window;delete (globalThis as any).document;delete (globalThis as any).self;}
});
