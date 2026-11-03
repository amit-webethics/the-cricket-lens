import {test} from 'node:test';import assert from 'node:assert/strict';
import {newsDetailsHtml,plainTextToHtml,richTextToPlain,sanitizeNewsHtml} from '../lib/cms/rich-text';
import {schemas} from '../lib/cms/schema';
import {fillEditorFromSource} from '../lib/cms/editor-source';
import {generateSection} from '../lib/cms/drafting';
test('rich news retains supported formatting and removes scripts, event handlers and dangerous links',()=>{
 const dirty='<h2>Career</h2><p><strong>Maxwell</strong> <em>retires</em></p><ul><li>World Cup</li></ul><a href="https://example.com" onclick="alert(1)">Source</a><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">Bad</a><iframe src="https://evil.test"></iframe>';
 const clean=sanitizeNewsHtml(dirty);assert.match(clean,/<strong>Maxwell<\/strong>/);assert.match(clean,/<ul><li>World Cup<\/li><\/ul>/);assert.match(clean,/rel="noopener noreferrer"/);assert.doesNotMatch(clean,/script|onclick|onerror|iframe|<img|javascript:/);
 const input={title:'News',slug:'news',summary:'Summary',sourceLabel:'Cricbuzz',sourceUrl:'https://www.cricbuzz.com/',details:dirty,detailsFormat:'html'};
 const saved=schemas.news.parse(input);assert.equal(saved.details,clean);assert.equal(saved.detailsFormat,'html');assert.equal(newsDetailsHtml(saved.details,saved.detailsFormat),clean);
});
test('legacy news and fetched content stay readable and literal markup is escaped',()=>{
 assert.equal(newsDetailsHtml('First paragraph.\n\nSecond paragraph.'),'<p>First paragraph.</p><p>Second paragraph.</p>');assert.equal(newsDetailsHtml('<script>literal</script>','plain'),'<p>&lt;script&gt;literal&lt;/script&gt;</p>');
 const source={url:'https://www.cricbuzz.com/cricket-news/123/news',publisher:'Cricbuzz',title:'News',fetchedAt:new Date().toISOString(),text:'Fetched paragraph.',sections:[],warning:''};
 const filled=fillEditorFromSource('news',{details:'<h2>Old</h2>',detailsFormat:'html'},source);assert.equal(filled.detailsFormat,'plain');assert.equal(newsDetailsHtml(filled.details,filled.detailsFormat),'<p>Fetched paragraph.</p>');
 assert.equal(richTextToPlain('<h2>Heading</h2><p>Bat &amp; ball</p>'),'Heading\n\nBat & ball');assert.equal(plainTextToHtml('AI paragraph one.\n\nAI paragraph two.'),'<p>AI paragraph one.</p><p>AI paragraph two.</p>');
});
test('AI sees readable text from formatted details, without markup instructions',async()=>{
 const oldKey=process.env.AI_GATEWAY_API_KEY,oldModel=process.env.AI_DRAFT_MODEL;process.env.AI_GATEWAY_API_KEY='test';process.env.AI_DRAFT_MODEL='test/model';
 try{let seen:any;await generateSection({kind:'news',target:'news_details',title:'News',description:'',heading:'Details',currentText:'<h2>Career</h2><p><strong>Known fact</strong></p>',currentTextFormat:'html',otherHeadings:[]},[],(async(o:any)=>{seen=JSON.parse(o.prompt);return {output:{draft:'Rewritten fact.',factsToCheck:[]}};}) as any);assert.equal(seen.currentText,'Career\n\nKnown fact');}finally{if(oldKey===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=oldKey;if(oldModel===undefined)delete process.env.AI_DRAFT_MODEL;else process.env.AI_DRAFT_MODEL=oldModel;}
});
