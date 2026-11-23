export const featuredMatch = {
 id:147964,
 title:'South Africa vs Bangladesh',
 description:'2nd Test · Bangladesh tour of South Africa, 2026',
};

export type FeaturedScore = {
 status:string;
 complete:boolean;
 innings:{id:number;team:string;runs:number;wickets:number|null;overs:number|null;declared:boolean}[];
 updatedAt:string;
};

function record(value:unknown):Record<string,unknown>{
 return value!==null&&typeof value==='object'?value as Record<string,unknown>:{};
}

export function parseFeaturedScore(payload:unknown,updatedAt:string):FeaturedScore|null{
 const data=record(payload);
 if(data.status!=='success'||!Array.isArray(data.data))return null;
 const match=data.data.map(record).find(row=>{
  const teams=Array.isArray(row.teams)?row.teams.map(team=>String(team).trim().toLowerCase()):[];
  return String(row.matchType).toLowerCase()==='test'&&
   String(row.dateTimeGMT??row.date).slice(0,10)==='2026-11-23'&&
   teams.length===2&&teams.includes('south africa')&&teams.includes('bangladesh');
 });
 if(!match||typeof match.status!=='string'||!match.status.trim())return null;
 const innings=Array.isArray(match.score)?match.score.flatMap((value,index)=>{
  const score=record(value);
  if(typeof score.inning!=='string'||!score.inning.trim()||typeof score.r!=='number')return [];
  return [{
   id:index+1,team:score.inning,runs:score.r,
   wickets:typeof score.w==='number'?score.w:null,
   overs:typeof score.o==='number'?score.o:null,
   declared:false,
  }];
 }):[];
 return {status:match.status.trim(),complete:match.matchEnded===true,innings,updatedAt};
}
