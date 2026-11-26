'use client';

import Link from 'next/link';
import type {Entry} from '../../lib/cms/schema';
import {compareChildOrder} from '../../lib/cms/article-groups';
import type {ArticleGroupFields, ArticleRole} from '../../lib/cms/article-groups';

type Props = {
  articleId: string | null;
  articles: Entry[];
  value: ArticleGroupFields;
  onChange: (value: ArticleGroupFields) => void;
};

export default function ArticleGroupSettings({articleId, articles, value, onChange}: Props) {
  const role = value.articleRole ?? 'standalone';
  const mainArticles = articles.filter(article =>
    article.id !== articleId && article.data.articleRole === 'main' &&
    (article.status !== 'archived' || article.id === value.parentArticleId),
  );
  const children = articleId ? articles.filter(article =>
    article.data.articleRole === 'child' && article.data.parentArticleId === articleId,
  ).sort((a, b) => compareChildOrder(a.data, b.data)) : [];

  return <section className="admin-panel admin-form-panel">
    <div className="admin-panel-heading"><h2>Article grouping</h2></div>
    <div className="admin-fields">
      <label>
        <span className="admin-field-label">Article role</span>
        <select value={role} onChange={event =>
          onChange({articleRole: event.target.value as ArticleRole, parentArticleId: '', childOrder: null})
        }>
          <option value="standalone">Standalone article</option>
          <option value="main">Main article</option>
          <option value="child">Child article</option>
        </select>
      </label>
      {role === 'child' && <>
        <label>
          <span className="admin-field-label">Main article</span>
          <select value={value.parentArticleId ?? ''} required onChange={event => onChange({parentArticleId: event.target.value})}>
            <option value="">Choose a main article</option>
            {mainArticles.map(article => <option key={article.id} value={article.id}>
              {article.title}{article.status === 'published' ? '' : ` (${article.status})`}
            </option>)}
          </select>
          {!mainArticles.length && <small>Save an article with the Main article role to make it available here.</small>}
        </label>
        <label>
          <span className="admin-field-label">Order under main article</span>
          <input type="number" min={1} max={9999} value={value.childOrder ?? ''}
            onChange={event => onChange({childOrder: event.target.value ? Number(event.target.value) : null})}/>
          <small>Lower numbers appear first. Leave blank to use the default article order.</small>
        </label>
      </>}
      {role === 'main' && (children.length ? <>
        <span className="admin-field-label">Child articles</span>
        {children.map(article => <Link className="admin-inline-link" key={article.id}
          href={`/admin/articles/edit/?id=${article.id}`} target="_blank" rel="noopener noreferrer">
          {article.title}{article.status === 'published' ? '' : ` (${article.status})`}
        </Link>)}
      </> : <p className="admin-help">Save this article, then select it as the main article from each child’s settings.</p>)}
    </div>
  </section>;
}
