import type {SourceReference} from './source-reference';
// Store every character while respecting the CMS's per-paragraph size limit.
export function sourceParagraphs(text:string){const paragraphs:string[]=[];for(const paragraph of text.split(/\n\s*\n/).filter(p=>p.trim())){for(let i=0;i<paragraph.length;i+=20000)paragraphs.push(paragraph.slice(i,i+20000));}if(paragraphs.length>50){const full=paragraphs.join('\n\n');return Array.from({length:Math.ceil(full.length/20000)},(_,i)=>full.slice(i*20000,(i+1)*20000));}return paragraphs.length?paragraphs:[''];}
export function fillEditorFromSource(kind:'articles'|'news',data:Record<string,any>,source:SourceReference):Record<string,any>{
 const sourceContent=[...(data.sourceContent||[]).filter((r:SourceReference)=>r.url!==source.url),source];
 if(sourceContent.length>5||sourceContent.reduce((n,r)=>n+r.text.length,0)>200000)throw new Error('Remove an older fetched source before adding more content.');
 if(kind==='news')return {...data,sourceContent,details:source.text,detailsFormat:'plain',newsSections:(source.sections.length?source.sections:[{heading:'Story',body:[source.text]}]).map(s=>({heading:s.heading||'Story',content:s.body.join('\n\n'),format:'plain'})),verified:false};
 const sections=(source.sections.length?source.sections:[{heading:'Story',body:[source.text]}]).map(s=>({heading:s.heading||'Story',body:sourceParagraphs(s.body.join('\n\n'))}));
 return {...data,sourceContent,sections,verified:false};
}
