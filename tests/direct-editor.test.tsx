import React,{act,useState} from 'react';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import SectionDraft from '../components/admin/SectionDraft';
import SourceContent from '../components/admin/SourceContent';
import {fillEditorFromSource} from '../lib/cms/editor-source';
import {schemas} from '../lib/cms/schema';
import {draftErrorMessage} from '../lib/cms/drafting';
const source={url:'https://www.cricbuzz.com/cricket-news/123/squad',publisher:'Cricbuzz',title:'Squad update',fetchedAt:'2026-11-03T05:00:00Z',text:'Full source paragraph one.\n\nFull source paragraph two.',sections:[{heading:'Selection',body:['Full source paragraph one.','Full source paragraph two.']}],warning:''};
test('fetch fills existing article paragraphs and news details, keeps provenance and clears verification',()=>{
 const data={title:'My title',verified:true,sections:[{heading:'Old',body:['Old paragraph']}],summary:'Old summary',sourceContent:[]};
 const article=fillEditorFromSource('articles',data,source);assert.equal(article.sections[0].body.join('\n\n'),source.text);assert.equal(article.sections[0].heading,'Selection');assert.equal(article.verified,false);assert.equal(article.title,'My title');assert.equal(data.sections[0].body[0],'Old paragraph');assert.equal(article.sourceContent[0].publisher,'Cricbuzz');
 const news=fillEditorFromSource('news',data,source);assert.equal(news.details,source.text);assert.equal(news.summary,'Old summary');assert.equal(news.verified,false);
 const long=source.text.repeat(100);const draft={title:'News',slug:'news',status:'draft',summary:long,sourceLabel:'Cricbuzz',sourceUrl:source.url,verified:false};
 assert.equal(schemas.news.safeParse(draft).success,true);assert.equal(schemas.news.safeParse({...draft,status:'published',verified:true}).success,false);
 assert.equal(draftErrorMessage({statusCode:402}).includes('credits'),true);assert.equal(draftErrorMessage({statusCode:401}).includes('API key'),true);
});
test('UI fetch and regenerate update the same fields, undo works, stale AI results preserve newer typing',async()=>{
 const {window}=parseHTML('<html><body></body></html>');
 Object.assign(globalThis,{window,document:window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const {createRoot}=await import('react-dom/client');const container=window.document.createElement('div');window.document.body.append(container);const root=createRoot(container);
 const originalFetch=globalThis.fetch;let pending:((v:Response)=>void)|undefined;let requests:any[]=[];let failFetch=false;let setTextOutside:(s:string)=>void=()=>{};
 globalThis.fetch=(async(url:any,options:any)=>{const payload=JSON.parse(options.body);requests.push({url,payload});if(String(url).endsWith('source-content'))return failFetch?new Response(JSON.stringify({error:'Source fetch failed'}),{status:502}):new Response(JSON.stringify({source}));return await new Promise<Response>(resolve=>{pending=resolve;});}) as any;
 function Harness({kind}:{kind:'articles'|'news'}){const[text,setText]=useState('Existing text');const[refs,setRefs]=useState<any[]>([]);setTextOutside=setText;return <><textarea aria-label="Editor text" readOnly value={text}/><SourceContent sources={[{label:'Cricbuzz',url:source.url}]} disabled={false} contentSnapshot={text} onFetch={s=>{setText(s.text);setRefs([s]);}}/><SectionDraft context={{kind,sourceContent:refs,title:'Squad',description:'',heading:kind==='news'?'News summary':'Selection',currentText:text,otherHeadings:[]}} disabled={false} onApply={setText}/></>;}
 const button=(name:string)=>{const found=[...container.querySelectorAll('button')].find(b=>b.textContent===name);assert.ok(found,name);return found;};
 const click=async(name:string)=>{await act(async()=>{button(name).dispatchEvent(new window.Event('click',{bubbles:true}));});};
 try{for(const kind of ['articles','news'] as const){await act(async()=>{root.render(<Harness key={kind} kind={kind}/>);});
 assert.equal(container.textContent?.includes('Facts or instructions'),false);assert.equal(container.querySelectorAll('textarea').length,1);
 await click('Fetch content');assert.equal((container.querySelector('textarea') as HTMLTextAreaElement).value,source.text);
 await click('Regenerate with AI');assert.equal(requests.at(-1).payload.currentText,source.text);assert.equal(requests.at(-1).payload.kind,kind);
 await act(async()=>{pending!(new Response(JSON.stringify({draft:'AI rewrite directly in the field.',factsToCheck:[]})));});
 assert.equal((container.querySelector('textarea') as HTMLTextAreaElement).value,'AI rewrite directly in the field.');assert.equal(container.textContent?.includes('Generated suggestion'),false);
 await click('Undo AI update');assert.equal((container.querySelector('textarea') as HTMLTextAreaElement).value,source.text);
 await click('Regenerate with AI');await act(async()=>{setTextOutside('New manual edits');});await act(async()=>{pending!(new Response(JSON.stringify({draft:'Stale rewrite',factsToCheck:[]})));});assert.equal((container.querySelector('textarea') as HTMLTextAreaElement).value,'New manual edits');
 await click('Regenerate with AI');await act(async()=>{pending!(new Response(JSON.stringify({error:'AI gateway unavailable'}),{status:503}));});assert.equal((container.querySelector('textarea') as HTMLTextAreaElement).value,'New manual edits');
 failFetch=true;await click('Fetch content');assert.equal((container.querySelector('textarea') as HTMLTextAreaElement).value,'New manual edits');failFetch=false;
 }}finally{await act(async()=>root.unmount());globalThis.fetch=originalFetch;delete (globalThis as any).window;delete (globalThis as any).document;}
});

test('AI rich news update uses paragraphs and undo restores the original formatted content',async()=>{
 const {window}=parseHTML('<html><body></body></html>');Object.assign(globalThis,{window,document:window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const {createRoot}=await import('react-dom/client');const host=window.document.createElement('div');const root=createRoot(host);const oldFetch=globalThis.fetch;const before='<h2>Career</h2><p><strong>Original fact.</strong></p>';let current=before;
 globalThis.fetch=(async()=>new Response(JSON.stringify({draft:'New paragraph.\n\nSecond paragraph.',factsToCheck:[]}))) as any;
 function Harness(){const[text,setText]=useState(before);current=text;return <SectionDraft disabled={false} context={{kind:'news',target:'news_details',currentTextFormat:'html',title:'News',description:'',heading:'Details',currentText:text,otherHeadings:[]}} onApply={setText}/>;}
 try{await act(async()=>{root.render(<Harness/>)});await act(async()=>{host.querySelector('button')!.dispatchEvent(new window.Event('click',{bubbles:true}));});assert.equal(current,'<p>New paragraph.</p><p>Second paragraph.</p>');const undo=[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo AI update')!;assert.equal(undo.hasAttribute('disabled'),false);await act(async()=>{undo.dispatchEvent(new window.Event('click',{bubbles:true}));});assert.equal(current,before);
 }finally{await act(async()=>root.unmount());globalThis.fetch=oldFetch;delete (globalThis as any).window;delete (globalThis as any).document;}
});
