export const featuredScoreRefreshMinutes = 15;

export const featuredMatch = {
 id:177210,
 title:'India A vs Sri Lanka A',
 description:"1st Semi-Final · ACC Men’s Asia Cup Rising Stars 2026",
 source:'https://www.cricbuzz.com/live-cricket-scores/177210/inda-vs-sla-1st-semi-final-a1-v-b2-acc-mens-asia-cup-rising-stars-2026',
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
  return String(row.dateTimeGMT??row.date).slice(0,10)==='2026-11-26'&&
   teams.length===2&&teams.includes('india a')&&teams.includes('sri lanka a');
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

export function parseCricbuzzScore(payload:unknown,updatedAt:string):FeaturedScore|null{
 const data=record(payload);
 const header=record(data.matchHeader);
 const status=header.status??data.status;
 if(String(header.matchId)!==String(featuredMatch.id)||typeof status!=='string'||!status.trim())return null;
 const scorecards=data.scoreCard??data.scorecard;
 const innings=Array.isArray(scorecards)?scorecards.flatMap(value=>{
  const card=record(value);
  const batting=record(card.batTeamDetails);
  const score=record(card.scoreDetails);
  const team=batting.batTeamName??batting.batTeamShortName;
  if(typeof team!=='string'||!team||typeof card.inningsId!=='number'||typeof score.runs!=='number')return [];
  return [{
   id:card.inningsId,team,runs:score.runs,
   wickets:typeof score.wickets==='number'?score.wickets:null,
   overs:typeof score.overs==='number'?score.overs:null,
   declared:score.isDeclared===true,
  }];
 }).sort((a,b)=>a.id-b.id):[];
 const complete=/^(complete|completed|abandon|abandoned|cancelled|canceled)$/i.test(String(header.state??''));
 return {status:status.trim(),complete,innings,updatedAt};
}
