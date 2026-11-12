import {z} from 'zod';
const MAX_TEXT=100_000;
export const sourceReferenceSchema=z.object({url:z.string().max(1500).url().refine(v=>v.startsWith('https://')),publisher:z.string().max(160),title:z.string().max(220),fetchedAt:z.string().datetime(),text:z.string().min(1).max(MAX_TEXT),sections:z.array(z.object({heading:z.string().max(200),body:z.array(z.string().max(20000)).max(100)})).max(50),category:z.string().max(160).default(''),tags:z.array(z.string().max(50)).max(20).default([]),imageUrl:z.string().max(1500).default(''),imageAlt:z.string().max(250).default(''),imageCredit:z.string().max(250).default(''),warning:z.string().max(500).default('')});
export type SourceReference=z.infer<typeof sourceReferenceSchema>;
export const sourceReferencesSchema=z.array(sourceReferenceSchema).max(5).refine(refs=>refs.reduce((n,r)=>n+r.text.length,0)<=200000,'Keep fetched source text below 200,000 characters');
