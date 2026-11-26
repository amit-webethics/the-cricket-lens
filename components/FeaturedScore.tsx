'use client';

import {useEffect,useState} from 'react';
import {featuredMatch,type FeaturedScore as Score} from '../lib/featured-score';

export default function FeaturedScore(){
 const [score,setScore]=useState<Score|null>(null);
 const [enabled,setEnabled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/featured-score/',{signal:controller.signal}).then(response=>response.json()).then(result=>{
   if(controller.signal.aborted)return;
   setScore(result.score);
   setEnabled(result.enabled);
   setMessage(result.message);
  }).catch(()=>{if(!controller.signal.aborted)setMessage('Score feed is temporarily unavailable.');});
  return ()=>controller.abort();
 },[]);
 async function refresh(){
  setBusy(true);
  setMessage('');
  try{
   const response=await fetch('/api/featured-score/',{method:'POST'});
   if(!response.ok)throw new Error('Score request failed');
   const result=await response.json();
   if(result.score)setScore(result.score);
   setEnabled(result.enabled);
   setMessage(result.message||'Score refreshed.');
  }catch{
   setMessage('Score feed is temporarily unavailable.');
  }finally{
   setBusy(false);
  }
 }
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
  {enabled&&!score?.complete&&<button type="button" className="text-button" disabled={busy} onClick={refresh}>{busy?'Refreshing…':'Refresh score'}</button>}
  <p><a className="text-button" href={featuredMatch.source} target="_blank" rel="noopener noreferrer">{score?.complete?'Full scorecard on Cricbuzz':'Live score on Cricbuzz'} ↗</a></p>
  {message&&<p role="status">{message}</p>}
 </section>;
}
