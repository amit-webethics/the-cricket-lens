export const featuredMatch = {
 id:147964,
 title:'South Africa vs Bangladesh',
 description:'2nd Test · Bangladesh tour of South Africa, 2026',
 source:'https://www.cricbuzz.com/live-cricket-scores/147964/rsa-vs-ban-2nd-test-bangladesh-tour-of-south-africa-2026',
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
 const header=record(data.matchHeader);
 if(header.matchId!=null&&String(header.matchId)!==String(featuredMatch.id))return null;
 const status=header.status??data.status;
 if(typeof status!=='string'||!status.trim())return null;
 const scorecards=data.scoreCard??data.scorecard;
 const innings=Array.isArray(scorecards)?scorecards.flatMap(value=>{
  const card=record(value);
  const batting=record(card.batTeamDetails);
  const score=record(card.scoreDetails);
  const team=batting.batTeamShortName??batting.batTeamName;
  if(typeof team!=='string'||!team||typeof card.inningsId!=='number'||typeof score.runs!=='number')return [];
  return [{
   id:card.inningsId,team,runs:score.runs,
   wickets:typeof score.wickets==='number'?score.wickets:null,
   overs:typeof score.overs==='number'?score.overs:null,
   declared:score.isDeclared===true,
  }];
 }).sort((a,b)=>a.id-b.id):[];
 return {status:status.trim(),complete:/^(complete|completed|abandon|abandoned|cancelled|canceled)$/i.test(String(header.state??'')),innings,updatedAt};
}
