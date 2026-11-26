import Link from 'next/link';

type StoryLink = {slug: string; title: string};

export default function ArticleGroupLinks({articles}: {articles: readonly StoryLink[]}) {
  if (!articles.length) return null;

  return <ul className="article-group-links" aria-label="Articles in this group">
    {articles.map(article => <li key={article.slug}>
      <Link href={`/articles/${article.slug}/`}>{article.title}</Link>
    </li>)}
  </ul>;
}
