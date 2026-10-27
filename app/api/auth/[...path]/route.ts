import {neonAuth} from '../../../../lib/neon/server';
const handler=neonAuth.handler();
function blocked(req:Request){const path=new URL(req.url).pathname.replace(/\/+$/,'').toLowerCase();return /\/api\/auth\/(?:sign-up(?:\/|$)|sign-in\/email-otp$)/.test(path)}
const deny=()=>Response.json({error:'Account creation is disabled.'},{status:403,headers:{'Cache-Control':'no-store'}});
export const GET=handler.GET;
export const POST:typeof handler.POST=(req,ctx)=>blocked(req)?Promise.resolve(deny()):handler.POST(req,ctx);
export const PUT:typeof handler.PUT=(req,ctx)=>blocked(req)?Promise.resolve(deny()):handler.PUT(req,ctx);
export const DELETE=handler.DELETE;
export const PATCH:typeof handler.PATCH=(req,ctx)=>blocked(req)?Promise.resolve(deny()):handler.PATCH(req,ctx);
