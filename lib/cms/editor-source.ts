import type {SourceReference} from './source-reference';

export function fillEditorFromSource(
 kind:'articles'|'news',
 data:Record<string,any>,
 source:SourceReference,
):Record<string,any>{
 const sections=source.sections.filter(section=>section.body.some(paragraph=>paragraph.trim())).map(section=>({
  heading:section.heading.trim()||'Source text',
  body:section.body.filter(paragraph=>paragraph.trim()),
 }));
 if(!sections.length){
  const body=source.text.split(/\n\s*\n/).flatMap(paragraph=>paragraph.match(/[\s\S]{1,20000}/g)||[]).filter(paragraph=>paragraph.trim());
  sections.push({heading:'Source text',body});
 }
 const sourceContent=[...(data.sourceContent||[]).filter((reference:SourceReference)=>reference.url!==source.url),source];
 if(sourceContent.length>5||sourceContent.reduce((total,reference)=>total+reference.text.length,0)>200000){
  throw new Error('Remove an older fetched source before adding more content.');
 }
 const metadata={
  sourceContent,verified:false,
  sourceImageUrl:source.imageUrl||'',
  sourceImageAlt:source.imageAlt||'',
  sourceImageCredit:source.imageCredit||'',
 };
 if(kind==='articles')return {...data,...metadata,sections:sections.map(section=>({...section,body:section.body.length>50?(section.body.join('\n\n').match(/[\s\S]{1,20000}/g)||[]):section.body}))};
 const newsSections=sections.map(({heading,body})=>({heading,content:body.join('\n\n'),format:'plain'}));
 const details=newsSections.map(({heading,content})=>heading+'\n\n'+content).join('\n\n');
 return {...data,...metadata,details,detailsFormat:'plain',newsSections};
}
