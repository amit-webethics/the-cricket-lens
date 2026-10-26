import {database,closeDatabase} from '../lib/cms/db';import {initialContentStatements} from '../lib/cms/import-content';
async function main(){try{const statements=await initialContentStatements();await database().begin(async tx=>{for(const sql of statements)await tx.unsafe(sql)});console.log('Imported missing website content as drafts. Existing database content was preserved.')}finally{await closeDatabase()}}
main().catch(e=>{console.error('Import failed:',e.code||e.name);process.exitCode=1});
