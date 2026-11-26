import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseCricbuzzScore,parseFeaturedScore} from '../lib/featured-score';

test('selects the exact semi-final and maps CricketData innings',()=>{
 const updated='2026-11-26T09:00:00Z';
 const match={date:'2026-11-26',matchType:'odi',teams:['Sri Lanka A','India A'],status:'Rain delay'};
 const innings={inning:'India A Inning 1',r:80,w:0,o:12.3};
 const other={...match,date:'2026-11-15',status:'Different match'};
 const completed={...match,matchEnded:true,score:[innings]};
 assert.deepEqual(parseFeaturedScore({status:'success',data:[other,match]},updated),{status:'Rain delay',complete:false,innings:[],updatedAt:updated});
 assert.deepEqual(parseFeaturedScore({status:'success',data:[completed]},updated)?.innings,[{id:1,team:innings.inning,runs:80,wickets:0,overs:12.3,declared:false}]);
 assert.equal(parseFeaturedScore({status:'success',data:[completed]},updated)?.complete,true);
 assert.equal(parseFeaturedScore({status:'success',data:[other]},updated),null);
 assert.equal(parseFeaturedScore({status:'failure',data:[match]},updated),null);
});

test('takes the scorecard for match 177210 and rejects a different match',()=>{
 const updated='2026-11-26T10:44:00Z';
 const matchHeader={matchId:177210,status:'India A batting',state:'In Progress'};
 const scoreCard=[{inningsId:1,batTeamDetails:{batTeamName:'India A'},scoreDetails:{runs:159,wickets:2,overs:21.5}}];
 assert.deepEqual(parseCricbuzzScore({matchHeader,scoreCard},updated),{
  status:'India A batting',complete:false,innings:[{id:1,team:'India A',runs:159,wickets:2,overs:21.5,declared:false}],updatedAt:updated,
 });
 assert.equal(parseCricbuzzScore({matchHeader:{...matchHeader,matchId:99},scoreCard},updated),null);
});
