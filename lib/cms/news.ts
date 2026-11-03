export const NEWS_SUMMARY_TARGET=200;
export const NEWS_SUMMARY_MAX=250;
export function wordCount(text:string){return text.trim()?text.trim().split(/\s+/u).length:0;}
export function publicNewsDetails(news:{details?:string;summary:string}){return news.details?.trim()||news.summary;}
export function newsEditorContent(news:{summary?:string;details?:string}){return {summary:news.summary||'',details:news.details||news.summary||''};}
