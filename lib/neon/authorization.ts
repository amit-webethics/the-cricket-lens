import {database} from '../cms/db';
type User={email?:string|null;emailVerified?:boolean|null}|null|undefined;
export async function authorizeUser(user:User,connection=database){if(!user?.email||user.emailVerified!==true)return false;const rows=await connection()`SELECT 1 FROM cms_admin_authorized WHERE email=${user.email.trim().toLowerCase()} AND active=true`;return rows.length===1}
