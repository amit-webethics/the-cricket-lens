'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import {ArrowLeft, Download, FileUp} from 'lucide-react';
import {api} from './AdminShell';
import {
  draftMarkdownTemplate,
  MAX_DRAFT_IMPORT_ARTICLES,
  MAX_DRAFT_MARKDOWN_BYTES,
} from '../../lib/cms/draft-markdown';
import type {MarkdownArticle} from '../../lib/cms/draft-markdown';
import type {Entry} from '../../lib/cms/schema';

type Preview = {
  series: string;
  articles: (MarkdownArticle & {slug: string; minutes: number})[];
  matches: Pick<Entry, 'id' | 'slug' | 'title' | 'status' | 'revision'>[];
};

type ImportResult = {
  imported: Pick<Entry, 'id' | 'slug' | 'title'>[];
  skipped: Pick<Entry, 'slug' | 'title'>[];
  updated?: Pick<Entry, 'id' | 'slug' | 'title' | 'status'>[];
};

export default function DraftImport() {
  const [categories, setCategories] = useState<Entry[]>([]);
  const [authors, setAuthors] = useState<Entry[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api('categories'), api('authors')])
      .then(([categoryResponse, authorResponse]) => {
        if (!active) return;
        const activeCategories = (categoryResponse.items as Entry[]).filter(entry => entry.status === 'published');
        const activeAuthors = (authorResponse.items as Entry[]).filter(entry => entry.status === 'published');
        setCategories(activeCategories);
        setAuthors(activeAuthors);
        setCategoryId(activeCategories.find(entry => entry.slug === 'analysis')?.id || activeCategories[0]?.id || '');
        setAuthorId(activeAuthors[0]?.id || '');
      })
      .catch((error: Error) => {if (active) setError(error.message);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, []);

  async function previewFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readyToPreview || !file) return;
    setPreview(null);
    setResult(null);
    setError('');
    if (!/\.md$/i.test(file.name) || !file.size || file.size > MAX_DRAFT_MARKDOWN_BYTES) {
      setError('Choose a non-empty Markdown (.md) file no larger than 500 KB.');
      return;
    }

    setBusy('preview');
    try {
      const text = await file.text();
      const next: Preview = await api('articles/import', {
        method: 'POST',
        body: JSON.stringify({action: 'preview', markdown: text, mode, ...(mode === 'create' ? {categoryId, authorId} : {})}),
      });
      const existing = new Set(next.matches.map(article => article.slug));
      setMarkdown(text);
      setPreview(next);
      setSelected(next.articles.filter(article => mode === 'update' ? existing.has(article.slug) : !existing.has(article.slug)).map(article => article.slug));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to preview this file.');
    } finally {
      setBusy(null);
    }
  }

  async function importSelected() {
    if (!preview || !selected.length || !readyToPreview) return;
    setBusy('import');
    setError('');
    try {
      const saved: ImportResult = await api('articles/import', {
        method: 'POST',
        body: JSON.stringify({
          action: 'import', markdown, mode, slugs: selected,
          ...(mode === 'update'
             ? {revisions: Object.fromEntries(preview.matches.filter(article => selected.includes(article.slug)).map(article => [article.slug, article.revision]))}
             : {categoryId, authorId}),
        }),
      });
      setResult(saved);
      setPreview(null);
      setSelected([]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to import the selected drafts.');
    } finally {
      setBusy(null);
    }
  }

  const matches = new Map(preview?.matches.map(article => [article.slug, article]));
  const readyToPreview = !!file && (mode === 'update' || (!!categoryId && !!authorId)) && !busy;

  return <>
    <div className="admin-page-heading">
      <div>
        <Link href="/admin/articles/" className="admin-inline-link"><ArrowLeft size={15}/> Blog articles</Link>
        <h1>Import articles</h1>
        <p>Upload a Markdown file to create drafts or update existing articles by URL slug.</p>
      </div>
      <a
        className="admin-secondary"
        download="cricket-lens-article-drafts.md"
        href={`data:text/markdown;charset=utf-8,${encodeURIComponent(draftMarkdownTemplate)}`}
      ><Download size={16}/> Download template</a>
    </div>

    <section className="admin-panel admin-form-panel" aria-labelledby="import-file-heading">
      <div className="admin-panel-heading"><h2 id="import-file-heading">Choose a file</h2></div>
      <form onSubmit={previewFile} className="admin-fields">
        <label>
          <span className="admin-field-label">Import mode</span>
          <select value={mode} disabled={!!busy} onChange={event => {
            setMode(event.target.value === 'update' ? 'update' : 'create');
            setPreview(null);
            setResult(null);
            setError('');
          }}>
            <option value="create">Create new drafts</option>
            <option value="update">Update existing articles</option>
          </select>
        </label>
        {mode === 'update' && <p className="admin-help">Updates apply to the existing article. Published articles are updated on the live site.</p>}
        <label>
          <span className="admin-field-label">Markdown file</span>
          <input
            type="file"
            accept=".md,text/markdown"
            required
            disabled={!!busy}
            onChange={event => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
              setError('');
            }}
          />
          <small>.md files up to 500 KB, with up to {MAX_DRAFT_IMPORT_ARTICLES} articles per file.</small>
        </label>
        {mode === 'create' && <><div className="admin-two-fields">
          <label>
            <span className="admin-field-label">Category for imported drafts</span>
            <select value={categoryId} onChange={event => setCategoryId(event.target.value)} disabled={loading || !!busy} required>
              <option value="">Choose a category</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}
            </select>
          </label>
          <label>
            <span className="admin-field-label">Author for imported drafts</span>
            <select value={authorId} onChange={event => setAuthorId(event.target.value)} disabled={loading || !!busy} required>
              <option value="">Choose an author</option>
              {authors.map(author => <option key={author.id} value={author.id}>{author.title}</option>)}
            </select>
          </label>
        </div>
        {!loading && (!categories.length || !authors.length) &&
          <p className="admin-help">An active <Link href="/admin/categories/">category</Link> and <Link href="/admin/authors/">author</Link> are required.</p>}</>}
        <div>
          <button type="submit" className="admin-primary" disabled={!readyToPreview}>
            <FileUp size={16}/>{busy === 'preview' ? 'Reading file…' : 'Preview articles'}
          </button>
        </div>
      </form>
    </section>

    {error && <div className="admin-alert error admin-import-result" role="alert">{error}</div>}

    {preview && <section className="admin-panel admin-form-panel admin-import-result" aria-labelledby="import-preview-heading">
      <div className="admin-panel-heading">
        <h2 id="import-preview-heading">Review articles</h2>
        <span>{preview.articles.length} found</span>
      </div>
      <div className="admin-fields">
        {preview.series && <p className="admin-help">Series or tournament <strong>{preview.series}</strong></p>}
        {preview.articles.map(article => {
          const match = matches.get(article.slug);
          const eligible = mode === 'update' ? !!match : !match;
          return <article key={article.slug} className="admin-section-editor">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={selected.includes(article.slug)}
                disabled={!eligible || !!busy}
                onChange={event => {
                  const checked = event.target.checked;
                  setSelected(current => checked ? [...current, article.slug] : current.filter(slug => slug !== article.slug));
                }}
              />
              <strong>{article.title}</strong>
            </label>
            <p className="admin-help">
              /{article.slug} · {article.minutes} min · {article.sources.length} {article.sources.length === 1 ? 'source' : 'sources'}
              {mode === 'update' ? (match ? ` · Update ${match.status} article` : ' · No matching URL slug') : match && ' · URL slug already in use'}
            </p>
            <details className="admin-import-preview">
              <summary>Read imported content</summary>
              <p>{article.description}</p>
              {article.sections.map((section, index) => <section key={index}>
                <h3>{section.heading}</h3>
                {section.body.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
              </section>)}
              {article.sources.length > 0 && <ul>{article.sources.map(({label, url}, index) =>
                <li key={index}><a href={url} target="_blank" rel="noreferrer">{label}</a></li>,
              )}</ul>}
            </details>
          </article>;
        })}
        <div>
          <button type="button" className="admin-primary" disabled={!selected.length || !readyToPreview} onClick={importSelected}>
            {busy === 'import' ? 'Saving articles…' : mode === 'update' ? `Update ${selected.length} selected articles` : `Import ${selected.length} selected as drafts`}
          </button>
        </div>
      </div>
    </section>}

    {result && <section className="admin-panel admin-form-panel admin-import-result" aria-labelledby="import-result-heading">
      <div className="admin-panel-heading"><h2 id="import-result-heading">Import complete</h2></div>
      <div className="admin-fields">
        <p role="status">{result.updated ? `${result.updated.length} ${result.updated.length === 1 ? 'article' : 'articles'} updated.` : `${result.imported.length} ${result.imported.length === 1 ? 'draft created' : 'drafts created'}.`}
          {result.skipped.length > 0 && ` ${result.skipped.length} skipped because their URL slugs were already in use.`}
        </p>
        {(result.updated ?? result.imported).map(({id, title}) => <Link key={id} className="admin-inline-link" href={`/admin/articles/edit/?id=${id}`}>{title}</Link>)}
        {result.skipped.map(({slug, title}) => <p key={slug} className="admin-help">Skipped {title} (/{slug})</p>)}
        <Link href="/admin/articles/" className="admin-inline-link">View all blog articles</Link>
      </div>
    </section>}
  </>;
}
