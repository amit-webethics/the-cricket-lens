export type Coverage={title:string;summary:string;published?:string;category?:string;kind?:string;source?:string;url?:string};
const stop=new Set('a an and are as at be by for from has have in into is it its of on or that the their this to was were with'.split(' '));
function words(s:string){return new Set(s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stop.has(w)));}
function similarity(a:string,b:string){const x=words(a),y=words(b);if(!x.size||!y.size)return 0;let n=0;for(const w of x)if(y.has(w))n++;return n/Math.max(x.size,y.size);}
function mode(d:Coverage){const s=`${d.category||''} ${d.title}`;if(/preview|prediction/i.test(s))return 'preview';if(/opinion|analysis|column|explainer|profile/i.test(s))return 'analysis';if(/report|review|highlights/i.test(s))return 'report';return d.kind||'review';}
export function coverageMatch(a:Coverage,b:Coverage):'same'|'possible'|'different'{
 if(a.url===b.url)return 'same';
 if(mode(a)!==mode(b))return 'different';
 const context=(title:string)=>[/(women|womens|women’s|women's|girls)\b/i.test(title),/\b(u19|u-19|under.?19)\b/i.test(title),/\b(india|australia|england|pakistan|zealand|africa) A\b/.test(title)].join(':');
 if(context(a.title)!==context(b.title))return 'different';
 const da=Date.parse(a.published||''),db=Date.parse(b.published||'');
 if(!Number.isFinite(da)||!Number.isFinite(db)||Math.abs(da-db)>36*3600000)return 'different';
 const na=(a.title.match(/\b\d+\w*\b/g)||[]).sort().join(','),nb=(b.title.match(/\b\d+\w*\b/g)||[]).sort().join(',');
 if(na&&nb&&na!==nb)return 'different';
 const t=similarity(a.title,b.title),s=similarity(a.summary,b.summary);
 // Distinct opinion pieces are never automatically combined, even on the same topic.
 if(mode(a)!=='analysis'&&t>=0.84&&(s>=0.35||a.title.toLowerCase()===b.title.toLowerCase()))return 'same';
 if(t>=0.38||(t>=0.25&&s>=0.5))return 'possible';
 return 'different';
}
