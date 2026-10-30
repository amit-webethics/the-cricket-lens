import {test} from 'node:test';import assert from 'node:assert/strict';
import {generateSection,sectionDraftInput} from '../lib/cms/drafting';
import {coverageMatch} from '../lib/cms/story-matching';
const input={title:'India announce squad',description:'',heading:'Selection changes',currentText:'',notes:'India selected two spinners.',otherHeadings:[]};
test('drafting sends bounded evidence, returns a suggestion and refuses invalid output',async()=>{
 process.env.AI_GATEWAY_API_KEY='test';process.env.AI_DRAFT_MODEL='test/model';let body:any;
 const fake=async(options:any)=>{body=options;return {output:{draft:'India have selected two spinners.',factsToCheck:['Confirm the squad announcement.']}};};
 const result=await generateSection(input,[{source:'Cricbuzz',url:'https://www.cricbuzz.com/cricket-news/1/story',summary:'Two spinners selected.'}],fake as any);
 assert.equal(result.draft,'India have selected two spinners.');assert.match(body.prompt,/Cricbuzz/);assert.match(body.instructions,/Never invent/);
 await assert.rejects(generateSection({...input,notes:''},[],fake as any),/DRAFT_NEEDS_FACTS/);
 await assert.rejects(generateSection(input,[],(async()=>({output:{}})) as any),/DRAFT_INVALID_RESPONSE/);
 assert.equal(sectionDraftInput.safeParse({...input,notes:'a'.repeat(8001)}).success,false);
 delete process.env.AI_GATEWAY_API_KEY;await assert.rejects(generateSection(input,[],fake as any),/DRAFT_NOT_CONFIGURED/);
});
test('coverage matching protects distinct types, dates, match numbers and opinions',()=>{
 const a={title:'India announce squad for Australia tour',summary:'India have announced their squad for the Australia tour.',published:'2026-10-30T01:00:00Z',url:'https://a.test/story',kind:'news'};
 assert.equal(coverageMatch(a,{...a,url:'https://b.test/story'}),'same');
 assert.equal(coverageMatch(a,{...a,published:'2026-10-25T01:00:00Z',url:'https://b.test/story'}),'different');
 assert.equal(coverageMatch({...a,title:'India Australia 1st T20 report'},{...a,title:'India Australia 2nd T20 report',url:'https://b.test/story'}),'different');
 assert.equal(coverageMatch({...a,title:'India Australia preview'},{...a,title:'India Australia match report',url:'https://b.test/story'}),'different');
 assert.equal(coverageMatch({...a,title:'India squad analysis'},{...a,title:'India squad analysis',url:'https://b.test/story'}),'possible');
 assert.equal(coverageMatch(a,{...a,published:'',url:'https://b.test/story'}),'different');
});
