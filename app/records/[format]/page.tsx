import Link from 'next/link';
import IPLRecords from '../../../components/IPLRecords';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
const formats:Record<string,string>={odi:'ODI',t20i:'T20I',test:'Test'};
export function generateStaticParams(){return Object.keys(formats).map(format=>({format}))}
export async function generateMetadata({params}:{params:Promise<{format:string}>}):Promise<Metadata>{const {format}=await params;return {title:`${formats[format]||'International'} Cricket Records | The Cricket Lens`}}
export default async function FormatRecords({params}:{params:Promise<{format:string}>}){
 const {format}=await params;
 if(!formats[format])notFound();
 const data:any=await readFile(join(process.cwd(),`lib/data/${format}-records.json`),'utf8').then(JSON.parse).catch(()=>null);
 return <main id="main" className="ipl-page"><p><Link href="/records/">← All international formats</Link></p><div className="ipl-intro"><span className="ipl-kicker">INTERNATIONAL CRICKET / MEN'S RECORDS</span><h1>{formats[format]} Records</h1><p>Historical batting, bowling and match statistics from available Cricsheet deliveries.</p><div className="ipl-jump">{Object.entries(formats).map(([key,label])=><Link href={`/records/${key}/`} key={key}>{label}</Link>)}</div></div><section className="ipl-section" style={{marginTop:24}}><div className="ipl-section-heading"><h2>{formats[format]} Statistics</h2><span>{data?.matches?.length||0} imported matches</span></div>{data?.players?.length?<IPLRecords records={data} basePath={`/records/${format}`}/>:<p className="ipl-empty">The {formats[format]} historical import is pending. Once the Cricsheet import workflow completes, batting, bowling and match records will appear here.</p>}<p className="ipl-stats-intro">Cricsheet (ODC-BY 1.0). Historical coverage is incomplete; figures reflect imported matches only and should not be treated as official all-time records.</p></section></main>
}
