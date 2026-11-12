import type {SourceReference} from './source-reference';
// Store every character while respecting the CMS's per-paragraph size limit.
export function sourceParagraphs(text:string){const paragraphs:string[]=[];for(const paragraph of text.split(/\n\s*\n/).filter(p=>p.trim())){for(let i=0;i<paragraph.length;i+=20000)paragraphs.push(paragraph.slice(i,i+20000));}if(paragraphs.length>50){const full=paragraphs.join('\n\n');return Array.from({length:Math.ceil(full.length/20000)},(_,i)=>full.slice(i*20000,(i+1)*20000));}return paragraphs.length?paragraphs:[''];}
export function fillEditorFromSource(kind:'articles'|'news',data:Record<string,any>,source:SourceReference):Record<string,any>{
 const sourceContent=[...(data.sourceContent||[]).filter((r:SourceReference)=>r.url!==source.url),source];
 if(sourceContent.length>5||sourceContent.reduce((n,r)=>n+r.text.length,0)>200000)throw new Error('Remove an older fetched source before adding more content.');
 const tags=[...new Set([...(data.tags||[]),...(source.tags||[])])].slice(0,20);
 const suggestedImage=source.imageUrl||'';
 const imageSuggestion={sourceImageUrl:suggestedImage,sourceImageAlt:source.imageAlt||'',sourceImageCredit:source.imageCredit||''};
 const paragraphs=source.sections.flatMap(section=>section.body.map((body,i)=>({heading:(section.heading&&section.heading!=='Story'?section.heading+' — ':'')+'Paragraph '+(i+1),body:sourceParagraphs(body)}))).slice(0,50);
 if(kind==='news')return {...data,sourceContent,tags,...imageSuggestion,details:source.text,detailsFormat:'plain',newsSections:paragraphs.map(s=>({heading:s.heading,content:s.body.join('\\n\\n'),format:'plain'})),verified:false};
 return {...data,sourceContent,tags,...imageSuggestion,sections:paragraphs.length?paragraphs:[{heading:'Story',body:sourceParagraphs(source.text)}],verified:false};
}
