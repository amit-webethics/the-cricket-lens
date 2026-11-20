import type {SourceReference} from './source-reference';

export type RewrittenSourceSection = {heading:string; body:string[]};

export function fillEditorFromSource(
 kind:'articles'|'news',
 data:Record<string,any>,
 source:SourceReference,
 sections:RewrittenSourceSection[],
):Record<string,any>{
 if(!sections.length)throw new Error('The rewrite did not contain any sections.');
 const sourceContent=[...(data.sourceContent||[]).filter((reference:SourceReference)=>reference.url!==source.url),source];
 if(sourceContent.length>5||sourceContent.reduce((total,reference)=>total+reference.text.length,0)>200000){
  throw new Error('Remove an older fetched source before adding more content.');
 }
 const tags=[...new Set([...(data.tags||[]),...(source.tags||[])])].slice(0,20);
 const metadata={
  sourceContent,tags,verified:false,
  sourceImageUrl:source.imageUrl||'',
  sourceImageAlt:source.imageAlt||'',
  sourceImageCredit:source.imageCredit||'',
 };
 if(kind==='articles')return {...data,...metadata,sections};
 const newsSections=sections.map(({heading,body})=>({heading,content:body.join('\n\n'),format:'plain'}));
 const details=newsSections.map(({heading,content})=>heading+'\n\n'+content).join('\n\n');
 return {...data,...metadata,details,detailsFormat:'plain',newsSections};
}
