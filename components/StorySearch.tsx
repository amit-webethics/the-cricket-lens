'use client';

import {Search} from 'lucide-react';
import Link from 'next/link';
import {useState} from 'react';

export type SearchStory = {title: string; summary: string; url: string; label: string};

function searchText(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export default function StorySearch({stories}: {stories: SearchStory[]}) {
  const [query, setQuery] = useState('');
  const terms = searchText(query).split(' ').filter(Boolean);
  const matches = terms.length ? stories.map(story => {
    const title = searchText(story.title);
    const content = searchText(story.summary);
    const rank = terms.filter(term => title.includes(term)).length;
    return {story, rank, matches: terms.every(term => title.includes(term) || content.includes(term))};
  }).filter(result => result.matches).sort((a, b) => b.rank - a.rank) : [];

  return <>
    <form role="search" className="story-search-form" onSubmit={event => event.preventDefault()}>
      <label htmlFor="story-search-query" className="visually-hidden">Search by article or news title</label>
      <Search size={19} aria-hidden="true"/>
      <input id="story-search-query" type="search" value={query} maxLength={120} autoFocus placeholder="Search articles and cricket news" onChange={event => setQuery(event.target.value)}/>
    </form>
    {terms.length > 0 && <>
      <p role="status" className="story-search-status">{matches.length ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}` : 'No stories found. Try a different name or keyword.'}</p>
      {matches.length > 0 && <ul className="story-search-results">{matches.map(({story}) => <li key={story.url}>
        <span>{story.label}</span>
        <h2><Link href={story.url}>{story.title}</Link></h2>
        {story.summary && <p>{story.summary}</p>}
      </li>)}</ul>}
    </>}
  </>;
}
