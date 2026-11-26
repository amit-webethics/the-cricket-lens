'use client';

import {useEffect,useRef,useState} from 'react';
import {featuredMatch,featuredScoreRefreshMinutes,type FeaturedScore as Score} from '../lib/featured-score';

const refreshInterval = featuredScoreRefreshMinutes * 60_000;
type ScoreResponse = {score: Score | null; enabled: boolean; message: string};

export default function FeaturedScore(){
 const [score,setScore]=useState<Score|null>(null);
 const [enabled,setEnabled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const manualRefresh=useRef<(() => void) | null>(null);
 useEffect(() => {
  const controller=new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy=false;
  let nextRefresh=Infinity;
  let nextMethod:'GET'|'POST'='GET';

  function schedule(method: 'GET' | 'POST', delay: number) {
   nextRefresh=Date.now()+delay;
   nextMethod=method;
   timer=setTimeout(() => void requestScore(method),delay);
  }

  async function requestScore(method: 'GET' | 'POST', manual=false) {
   if(busy||controller.signal.aborted)return;
   busy=true;
   clearTimeout(timer);
   nextRefresh=Infinity;
   if(method==='POST')setBusy(true);
   if(manual)setMessage('');
   try{
    const response=await fetch('/api/featured-score/',{method,signal:controller.signal});
    if(!response.ok)throw new Error('Score request failed');
    const result:ScoreResponse=await response.json();
    if(controller.signal.aborted)return;
    if(result.score)setScore(result.score);
    setEnabled(result.enabled);
    setMessage(result.message||(manual?'Score refreshed.':''));
    if(result.enabled&&!result.score?.complete){
     const lastChecked=result.score ? Date.parse(result.score.updatedAt) : 0;
     const delay=method==='GET' ? Math.max(0,Math.min(refreshInterval,lastChecked+refreshInterval-Date.now())) : refreshInterval;
     schedule('POST',delay);
    }
   }catch{
    if(controller.signal.aborted)return;
    setMessage('Score feed is temporarily unavailable.');
    schedule(method,refreshInterval);
   }finally{
    busy=false;
    if(!controller.signal.aborted&&method==='POST')setBusy(false);
   }
  }

  function refreshOnReturn() {
   if(document.visibilityState==='visible'&&Date.now()>=nextRefresh)void requestScore(nextMethod);
  }

  manualRefresh.current=()=>void requestScore('POST',true);
  document.addEventListener('visibilitychange',refreshOnReturn);
  void requestScore('GET');
  return ()=>{
   controller.abort();
   clearTimeout(timer);
   document.removeEventListener('visibilitychange',refreshOnReturn);
   manualRefresh.current=null;
  };
 },[]);
 return <section className="news-intro" aria-labelledby="featured-score-title">
  <span className="news-status">Featured match</span>
  <h2 id="featured-score-title">{featuredMatch.title}</h2>
  <span>{featuredMatch.description}</span>
  {score?<div aria-live="polite">
   {score.innings.map(innings=><p key={innings.id}>
    {innings.team} <strong>{innings.runs}{innings.wickets===null?'':`/${innings.wickets}`}{innings.declared?'d':''}</strong>
    {innings.overs===null?'':` (${innings.overs} ov)`}
   </p>)}
   <p>{score.status}</p>
   <small>Last checked <time dateTime={score.updatedAt}>{new Date(score.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} IST</time></small>
  </div>:null}
  {enabled&&!score?.complete&&<button type="button" className="text-button" disabled={busy} onClick={()=>manualRefresh.current?.()}>{busy?'Refreshing…':'Refresh score'}</button>}
  <p><a className="text-button" href={featuredMatch.source} target="_blank" rel="noopener noreferrer">{score?.complete?'Full scorecard on Cricbuzz':'Live score on Cricbuzz'} ↗</a></p>
  {message&&<p role="status">{message}</p>}
 </section>;
}
