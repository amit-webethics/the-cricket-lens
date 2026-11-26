import Link from 'next/link';

type StoryLink = {slug: string; title: string};
type StoryKind = 'articles' | 'news';

export default function ArticleGroupLinks({
  articles, kind = 'articles', label = 'Articles in this group',
}: {articles: readonly StoryLink[]; kind?: StoryKind; label?: string | null}) {
  if (!articles.length) return null;

  return <ul className="article-group-links" aria-label={label ?? undefined}>
    {articles.map(article => <li key={article.slug}>
      <Link href={`/${kind}/${article.slug}/`}>{article.title}</Link>
    </li>)}
  </ul>;
}

export function RelatedStories({
  stories, kind = 'articles', authorBio,
}: {stories: readonly StoryLink[]; kind?: StoryKind; authorBio?: string}) {
  return <>
    {authorBio && <p className="article-author-bio">{authorBio}</p>}
    {stories.length > 0 && <section className="more-related-stories" aria-labelledby="more-related-title">
      <h2 id="more-related-title">{kind === 'news' ? 'More related news' : 'More related articles'}</h2>
      <ArticleGroupLinks articles={stories} kind={kind} label={null}/>
    </section>}
  </>;
}
