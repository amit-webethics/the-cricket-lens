import {createNeonAuth} from '@neondatabase/auth/next/server';import {authorizeUser} from './authorization';
export const neonAuth=createNeonAuth({baseUrl:process.env.NEON_AUTH_BASE_URL!,cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET!}});
export async function isAdmin(){try{const {data}=await neonAuth.getSession({query:{disableCookieCache:true}});return await authorizeUser(data?.user)}catch{return false}}
