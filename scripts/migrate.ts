import {readFile} from 'node:fs/promises';
import {database,closeDatabase} from '../lib/cms/db';
import {saveEntry,listEntries} from '../lib/cms/db';
async function main(){try{await database().unsafe(await readFile(new URL('../db/001_cms.sql',import.meta.url),'utf8'));
const cats=await listEntries('categories');for(const title of ['Match Reports','Match Previews','Player Analysis','Opinions & Explainers'])if(!cats.some(c=>c.title===title))await saveEntry('categories',{title,slug:title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),status:'published',description:''});
if(!(await listEntries('authors')).length)await saveEntry('authors',{title:'The Cricket Lens',slug:'the-cricket-lens',status:'published',role:'Editorial desk',bio:'Independent cricket stories and perspectives.',imageUrl:''});
if(!(await listEntries('settings')).length)await saveEntry('settings',{title:'Site settings',slug:'site',status:'published',siteName:'The Cricket Lens',tagline:'The game. The stories. Our perspective.',contactEmail:'',correctionsEmail:'',operatorName:'',socialUrl:'',seoTitle:'',seoDescription:''});
for(const [slug,title] of Object.entries({about:'About the Lens',contact:'Contact',editorial:'Editorial standards',privacy:'Privacy policy',terms:'Terms of use',corrections:'Corrections policy'}))if(!(await listEntries('pages')).some(p=>p.slug===slug))await saveEntry('pages',{title,slug,status:'draft',intro:'',sections:[{heading:title,body:['Add your reviewed page content here.']}],seoTitle:'',seoDescription:'',socialImage:''});
console.log('PostgreSQL schema and initial categories, author, settings and draft pages are ready.');}finally{await closeDatabase();}

}
main().catch(e=>{console.error("Migration failed:",e.code||e.message);process.exitCode=1;});
