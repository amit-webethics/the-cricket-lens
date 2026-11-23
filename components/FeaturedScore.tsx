'use client';

import {useEffect,useState} from 'react';
import {featuredMatch,type FeaturedScore as Score} from '../lib/featured-score';

export default function FeaturedScore(){
 const [score,setScore]=useState<Score|null>(null);
 useEffect(()=>{
  let active=true;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();
  async function refresh(){
   try{
    const response=await fetch('/api/featured-score/',{signal:controller.signal});
    if(!response.ok)return;
    const result=await response.json() as {enabled:boolean;score:Score|null};
    if(!active)return;
    if(result.score)setScore(result.score);
    if(result.enabled&&!result.score?.complete)timer=setTimeout(refresh,15*60*1000);
   }catch{
    // The source link remains available if the site feed cannot load.
   }
  }
  void refresh();
  return ()=>{active=false;controller.abort();clearTimeout(timer);};
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
   <small>Updated <time dateTime={score.updatedAt}>{new Date(score.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} IST</time></small>
  </div>:<p>Follow the match on Cricbuzz.</p>}
  <p><a href={featuredMatch.source} target="_blank" rel="noopener noreferrer">Cricbuzz scorecard ↗</a></p>
 </section>;
}
