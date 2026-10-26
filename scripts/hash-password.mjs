import {randomBytes,scryptSync} from 'node:crypto';
import readline from 'node:readline';
if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal.');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
process.stdout.write('New admin password (at least 12 characters; input is hidden): ');
rl._writeToOutput=()=>{};
rl.question('',password=>{rl.close();process.stdout.write('\n');if(password.length<12){process.stderr.write('Use at least 12 characters.\n');process.exitCode=1;return;}const salt=randomBytes(16).toString('hex');console.log('ADMIN_PASSWORD_HASH='+`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`);});
