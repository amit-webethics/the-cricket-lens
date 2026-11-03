import {test} from 'node:test';import assert from 'node:assert/strict';
import {schemas} from '../lib/cms/schema';
import {generateSection,gatewayConfiguration,draftErrorMessage} from '../lib/cms/drafting';
import {publicNewsDetails,newsEditorContent,wordCount} from '../lib/cms/news';
const base={title:'Selection update',slug:'selection-update',status:'published',verified:true,sourceLabel:'Cricbuzz',sourceUrl:'https://www.cricbuzz.com/cricket-news/123/update',summary:'word '.repeat(200).trim(),details:'Full story paragraph one.\n\nFull story paragraph two.'};
test('news summary and details persist independently, and legacy items still have readable detail text',()=>{
 const result=schemas.news.parse(base);assert.equal(wordCount(result.summary),200);assert.equal(result.details,base.details);
 assert.equal(schemas.news.safeParse({...base,summary:'word '.repeat(251)}).success,false);
 assert.equal(schemas.news.safeParse({...base,summary:'word '.repeat(251),status:'draft'}).success,true);
 assert.equal(publicNewsDetails({summary:'Older update'}),'Older update');
 assert.equal(newsEditorContent({summary:'Older update'}).details,'Older update');
});
test('AI distinguishes roughly 200-word summary generation from full detail regeneration',async()=>{
 const env={AI_GATEWAY_API_KEY:process.env.AI_GATEWAY_API_KEY,AI_DRAFT_MODEL:process.env.AI_DRAFT_MODEL};process.env.AI_GATEWAY_API_KEY='test';process.env.AI_DRAFT_MODEL='test/model';
 try{const prompts:any[]=[];const fake=async(options:any)=>{prompts.push(options);return {output:{draft:prompts.length===1?'word '.repeat(200).trim():base.details,factsToCheck:[]}};};
 const input={kind:'news' as const,title:base.title,description:'',heading:'News',currentText:'',supportingText:base.details,otherHeadings:[]};
 const summary=await generateSection({...input,target:'news_summary'},[],fake as any);assert.equal(wordCount(summary.draft),200);assert.match(prompts[0].instructions,/about 200 words/);assert.equal(JSON.parse(prompts[0].prompt).supportingText,base.details);
 const details=await generateSection({...input,target:'news_details'},[],fake as any);assert.equal(details.draft,base.details);assert.match(prompts[1].instructions,/full news story/);
 }finally{for(const [key,value]of Object.entries(env))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
test('Gateway configuration normalizes copy-paste whitespace and distinguishes key/account errors',()=>{
 assert.deepEqual(gatewayConfiguration({AI_GATEWAY_API_KEY:'  "vck_test"  ',AI_DRAFT_MODEL:' openai/test-model '}),{key:'vck_test',model:'openai/test-model'});
 assert.deepEqual(gatewayConfiguration({AI_DRAFT_MODEL:'openai/test-model',VERCEL_OIDC_TOKEN:'deployment-token'}),{key:'',model:'openai/test-model'});
 assert.throws(()=>gatewayConfiguration({AI_GATEWAY_API_KEY:'sk-provider-key',AI_DRAFT_MODEL:'openai/test-model'}),/DRAFT_WRONG_KEY/);
 assert.match(draftErrorMessage({statusCode:403,responseBody:'{"error":{"code":"customer_verification_required"}}'}),/verification/);
 assert.match(draftErrorMessage({statusCode:401}),/Production/);
 assert.match(draftErrorMessage({statusCode:403}),/team/);
});
