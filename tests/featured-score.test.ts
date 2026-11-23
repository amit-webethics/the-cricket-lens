import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseFeaturedScore} from '../lib/featured-score';

test('selects the exact Test and maps CricketData innings',()=>{
 const updated='2026-11-23T09:00:00Z';
 const match={date:'2026-11-23',matchType:'Test',teams:['Bangladesh','South Africa'],status:'Rain delay'};
 const innings={inning:'South Africa Inning 1',r:80,w:0,o:12.3};
 const other={...match,date:'2026-11-15',status:'Different Test'};
 const completed={...match,matchEnded:true,score:[innings]};
 assert.deepEqual(parseFeaturedScore({status:'success',data:[other,match]},updated),{status:'Rain delay',complete:false,innings:[],updatedAt:updated});
 assert.deepEqual(parseFeaturedScore({status:'success',data:[completed]},updated)?.innings,[{id:1,team:innings.inning,runs:80,wickets:0,overs:12.3,declared:false}]);
 assert.equal(parseFeaturedScore({status:'success',data:[completed]},updated)?.complete,true);
 assert.equal(parseFeaturedScore({status:'success',data:[other]},updated),null);
 assert.equal(parseFeaturedScore({status:'failure',data:[match]},updated),null);
});
