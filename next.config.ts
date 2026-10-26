import type {NextConfig} from 'next';
const nextConfig:NextConfig={...(process.env.NEXT_STATIC_REVIEW==='1'?{output:'export' as const}:{}),trailingSlash:true,images:{unoptimized:true},...(process.env.NEXT_STATIC_REVIEW==='1'?{}:{async headers(){return [{source:'/admin/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Cache-Control',value:'no-store'},{key:'X-Frame-Options',value:'DENY'}]},{source:'/api/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'}]}]}})};
export default nextConfig;
