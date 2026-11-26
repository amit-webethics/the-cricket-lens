import type {Metadata} from 'next';
import StorySearch from '../../components/StorySearch';
import {publicContent} from '../../lib/cms/public';

export const metadata: Metadata = {title: 'Search stories', robots: {index: false, follow: true}};

export default async function Page() {
  const {articles, news} = await publicContent();
  const stories = [
    ...articles.filter(article => !article.label).map(article => ({
      title: article.title,
      summary: article.description,
      url: `/articles/${article.slug}/`,
      label: article.category,
    })),
    ...news.map(item => ({
      title: item.title,
      summary: item.description || item.summary || '',
      url: `/news/${item.slug}/`,
      label: 'Cricket news',
    })),
  ];

  return <main id="main" className="story-search-page">
    <h1>Search stories</h1>
    <StorySearch stories={stories}/>
  </main>;
}
