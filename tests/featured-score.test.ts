import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseFeaturedScore} from '../lib/featured-score';

test('reads featured Test innings in order and accepts a delay before play',()=>{
 const updatedAt='2026-11-23T09:00:00Z';
 const matchHeader={matchId:147964,status:'Rain delay',state:'Delay'};
 assert.deepEqual(parseFeaturedScore({matchHeader},updatedAt),{status:'Rain delay',complete:false,innings:[],updatedAt});
 const innings=(inningsId:number,runs:number)=>({inningsId,batTeamDetails:{batTeamShortName:'RSA'},scoreDetails:{runs,wickets:0,overs:12.3}});
 const card=parseFeaturedScore({matchHeader,scoreCard:[innings(3,54),innings(1,80)]},updatedAt);
 assert.deepEqual(card?.innings.map(({id,runs,wickets,overs})=>[id,runs,wickets,overs]),[[1,80,0,12.3],[3,54,0,12.3]]);
 assert.equal(parseFeaturedScore({matchHeader:{...matchHeader,state:'Complete'}},updatedAt)?.complete,true);
 assert.equal(parseFeaturedScore({matchHeader:{...matchHeader,matchId:99}},updatedAt),null);
 assert.equal(parseFeaturedScore({message:'Quota exceeded'},updatedAt),null);
});
