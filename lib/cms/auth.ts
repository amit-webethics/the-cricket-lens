import {createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {database} from './db';
export const cookieName='cricket_lens_session';
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function verifyPassword(value:string,encoded:string){try{const[version,salt,digest]=encoded.split(':');if(version!=='scrypt'||!salt||!digest)return false;const expected=Buffer.from(digest,'hex');const actual=scryptSync(value,salt,64);return expected.length===64&&timingSafeEqual(expected,actual);}catch{return false;}}
export function configured(){return Boolean(process.env.DATABASE_URL&&process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD_HASH);}
export async function validSession(token:string|undefined,sql=database){if(!token||token.length!==64||!configured())return false;const rows=await sql()`SELECT token_hash FROM cms_sessions WHERE token_hash=${hash(token)} AND expires_at>now()`;return rows.length>0;}
export async function login(email:string,password:string,connection=database){const sql=connection();const key=hash((process.env.ADMIN_EMAIL||'').toLowerCase());const rows=await sql`INSERT INTO cms_login_attempts(key,attempts,started_at) VALUES(${key},1,now()) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN cms_login_attempts.started_at < now()-interval '15 minutes' THEN 1 ELSE cms_login_attempts.attempts+1 END,started_at=CASE WHEN cms_login_attempts.started_at < now()-interval '15 minutes' THEN now() ELSE cms_login_attempts.started_at END RETURNING attempts`;
 if(rows[0].attempts>10)throw new Error('RATE_LIMIT');const matches=verifyPassword(password,process.env.ADMIN_PASSWORD_HASH||'');if(email.toLowerCase()!==process.env.ADMIN_EMAIL?.toLowerCase()||!matches)return null;
 const token=randomBytes(32).toString('hex');await sql`DELETE FROM cms_sessions WHERE expires_at<=now()`;await sql`INSERT INTO cms_sessions(token_hash,expires_at) VALUES(${hash(token)},now()+interval '8 hours')`;await sql`DELETE FROM cms_login_attempts WHERE key=${key}`;return token;}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !!origin&&origin===new URL(request.url).origin;}
