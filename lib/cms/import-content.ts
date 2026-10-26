import {readFile} from 'node:fs/promises';
import {articles} from '../articles';
import {initialPages} from './initial-pages';
const quote=(s:string)=>"'"+s.replace(/'/g,"''")+"'";
function record(kind:string,data:any){return `INSERT INTO cms_records(kind,title,slug,status,data,published_at) VALUES(${quote(kind)},${quote(data.title)},${quote(data.slug)},${quote(data.status)},${quote(JSON.stringify(data))}::jsonb,${data.status==='published'?'now()':'NULL'}) ON CONFLICT(kind,slug) DO NOTHING`;}
export async function initialContentStatements(){const schema=await readFile(new URL('../../db/001_cms.sql',import.meta.url),'utf8');const sql=schema.split(';').map(s=>s.trim()).filter(Boolean);const categories=['Match Reports','Match Previews','Player Analysis','Opinions & Explainers'];
 for(const title of categories)sql.push(record('categories',{title,slug:title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),status:'published',description:''}));
 sql.push(record('authors',{title:'The Cricket Lens',slug:'the-cricket-lens',status:'published',role:'Editorial desk',bio:'Independent cricket stories and perspectives.',imageUrl:''}));
 sql.push(record('settings',{title:'Site settings',slug:'site',status:'published',siteName:'The Cricket Lens',tagline:'The game. The stories. Our perspective.',contactEmail:'',correctionsEmail:'',operatorName:'',socialUrl:'',seoTitle:'',seoDescription:''}));
 for(const p of initialPages)sql.push(record('pages',p));
 for(const [slug,title] of Object.entries({contact:'Contact',terms:'Terms of use',corrections:'Corrections policy'}))sql.push(record('pages',{title,slug,status:'draft',intro:'',sections:[{heading:title,body:['Complete and review this page before publishing.']}],seoTitle:'',seoDescription:'',socialImage:''}));
 for(const article of articles){const {category,label,...content}=article;const d={...content,status:'draft',tags:[],imageUrl:'',imageAlt:'',imageCredit:'',featured:false,sources:[],seoTitle:'',seoDescription:'',socialImage:'',correctionNote:'Imported from the website preview. Verify facts and sources before publishing.',verified:false,imageRightsConfirmed:false};sql.push(`INSERT INTO cms_records(kind,title,slug,status,data) SELECT 'articles',${quote(article.title)},${quote(article.slug)},'draft',${quote(JSON.stringify(d))}::jsonb || jsonb_build_object('categoryId',c.id,'authorId',a.id) FROM cms_records c CROSS JOIN cms_records a WHERE c.kind='categories' AND c.title=${quote(category)} AND a.kind='authors' AND a.slug='the-cricket-lens' ON CONFLICT(kind,slug) DO NOTHING`);}
 return sql;
}
