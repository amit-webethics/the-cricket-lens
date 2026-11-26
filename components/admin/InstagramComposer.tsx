'use client';

import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {api} from './AdminShell';

type Article = {id: string; title: string; slug: string; description: string; cover: string};
type Account = {id: string; username: string};
type Prepared = {containerId: string; proof: string; accountId: string; articleId: string; caption: string; image: string; attempted: boolean};

const storageKey = 'cricket-lens-instagram-prepared';
const initialCaption = (article?: Article) => article ? [article.title, article.description, 'Read the full article on The Cricket Lens.'].filter(Boolean).join('\n\n') : '';

export default function InstagramComposer() {
  const fromArticle = useSearchParams().get('article');
  const [articles, setArticles] = useState<Article[]>([]);
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [connectionError, setConnectionError] = useState('');
  const [articleId, setArticleId] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [published, setPublished] = useState<{permalink?: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const lastUpload = useRef<{file: File; alt: string; id: string; url: string} | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const selected = articles.find(article => article.id === articleId);
  const image = prepared?.image || previewUrl || selected?.cover || '';

  useEffect(() => {
    let active = true;
    api('instagram/account').then(({account}) => {
      if (active) setAccount(account);
    }).catch((error: Error) => {
      if (active) {
        setAccount(null);
        setConnectionError(error.message);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('instagram/articles').then(({items}: {items: Article[]}) => {
      if (!active) return;
      setArticles(items);
      let previous: Prepared | null = null;
      try { previous = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch {}
      const initial = items.find(article => article.id === fromArticle);
      setPrepared(previous);
      setArticleId(previous?.articleId || initial?.id || '');
      setCaption(previous?.caption || initialCaption(initial));
    }).catch((error: Error) => {
      if (active) setError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [fromArticle]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function savePrepared(value: Prepared | null) {
    setPrepared(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }

  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to complete this Instagram request.');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  async function prepare() {
    if (!account || !selected || !image || !caption.trim()) return;
    let mediaId: string | undefined;
    let photo = selected.cover;
    if (file) {
      const description = alt.trim();
      if ((file.type && file.type !== 'image/jpeg') || !file.size || file.size > 2_097_152 || !description) {
        throw new Error('Choose a JPEG under 2 MB and provide alternative text.');
      }
      if (lastUpload.current?.file !== file || lastUpload.current.alt !== description) {
        const upload = new FormData();
        upload.set('file', file.type ? file : new File([file], file.name, {type: 'image/jpeg'}));
        upload.set('alt', description);
        const media = await api('media', {method: 'POST', body: upload});
        lastUpload.current = {file, alt: description, id: media.id, url: media.url};
      }
      mediaId = lastUpload.current.id;
      photo = lastUpload.current.url;
    }
    const request = {articleId, accountId: account.id, caption: caption.trim(), mediaId};
    const {containerId, proof} = await api('instagram/prepare', {method: 'POST', body: JSON.stringify(request)});
    savePrepared({containerId, proof, accountId: account.id, articleId, caption: request.caption, image: photo, attempted: false});
  }

  async function publish() {
    if (!prepared || prepared.accountId !== account?.id) return;
    const {containerId, accountId, proof} = prepared;
    savePrepared({...prepared, attempted: true});
    const post = await api('instagram/publish', {method: 'POST', body: JSON.stringify({containerId, accountId, proof})});
    if (post.status === 'PUBLISHED') {
      setPublished({permalink: post.permalink});
      savePrepared(null);
    } else if (post.status === 'IN_PROGRESS') {
      setNotice('Instagram is still preparing the image. Check this post again in about a minute.');
    } else {
      savePrepared({...prepared, attempted: false});
      setError(post.status === 'EXPIRED' ? 'This prepared post expired. Edit and prepare it again.' : 'Instagram could not process this photo. Edit the post and try a different JPEG.');
    }
  }

  return <>
    <div className="admin-page-heading">
      <div><h1>Instagram posts</h1><p>Create a photo post from a published article.</p></div>
    </div>
    {account ? (
      <p className="admin-alert success">Publishing to <a href={`https://www.instagram.com/${account.username}/`} target="_blank" rel="noreferrer">@{account.username}</a></p>
    ) : account === null ? (
      <div className="admin-alert setup">
        <div><strong>Connect your Instagram account</strong>
          <p>{connectionError || 'Add the professional account’s publishing token as INSTAGRAM_ACCESS_TOKEN in Vercel and redeploy.'}</p>
          <a href="https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login" target="_blank" rel="noreferrer">Meta setup guide</a>
        </div>
      </div>
    ) : <p role="status">Checking Instagram connection…</p>}
    {error && <p className="admin-alert error" role="alert">{error}</p>}
    {notice && <p className="admin-alert setup" role="status">{notice}</p>}
    {published && <div className="admin-alert success" role="status">
      Published on Instagram. {postLink(published.permalink, account?.username)}
    </div>}
    {loading ? <p className="admin-loading">Loading published articles…</p> : (
      <div className="admin-instagram-grid">
        <section className="admin-panel admin-form-panel" aria-labelledby="instagram-compose-title">
          <div className="admin-panel-heading"><h2 id="instagram-compose-title">{prepared ? 'Review prepared post' : 'Compose post'}</h2></div>
          <div className="admin-fields">
            <label>Blog article
              <select value={articleId} disabled={busy || !!prepared || !!published} onChange={event => {
                const id = event.target.value;
                setArticleId(id);
                setCaption(initialCaption(articles.find(article => article.id === id)));
                setFile(null);
                setAlt('');
              }}>
                <option value="">Choose a published article</option>
                {articles.map(article => <option key={article.id} value={article.id}>{article.title}</option>)}
              </select>
            </label>
            {selected && <a className="admin-inline-link" href={`/articles/${selected.slug}/`} target="_blank" rel="noreferrer">Open article ↗</a>}
            <label>Caption
              <textarea value={caption} onChange={event => setCaption(event.target.value)} rows={7} maxLength={2200} readOnly={!!prepared || !!published || busy}/>
              <small>{caption.length} / 2,200 characters</small>
            </label>
            {!prepared && !published && <label>
              {selected?.cover ? 'Replace the article cover for this post' : 'Upload a photo'}
              <input type="file" accept="image/jpeg,.jpg,.jpeg" disabled={busy || !selected} onChange={event => setFile(event.target.files?.[0] || null)}/>
              <small>JPEG under 2 MB. The upload is used for this post.</small>
            </label>}
            {file && !prepared && !published && <label>Alternative text
              <input maxLength={250} value={alt} onChange={event => setAlt(event.target.value)} disabled={busy}/>
            </label>}
            <div className="admin-button-row">
              {published ? (
                <button type="button" className="admin-secondary" onClick={() => {setPublished(null);setFile(null);setAlt('');}}>Create another post</button>
              ) : prepared ? <>
                <button type="button" className="admin-primary" disabled={busy || prepared.accountId !== account?.id} onClick={() => run(publish)}>
                  {busy ? 'Checking Instagram…' : prepared.attempted ? 'Check and retry publish' : 'Publish to Instagram'}
                </button>
                {!prepared.attempted && <button type="button" className="admin-secondary" disabled={busy} onClick={() => {savePrepared(null);setError('');}}>Edit post</button>}
                {prepared.attempted && <button type="button" className="admin-secondary" disabled={busy} onClick={() => {
                  if (window.confirm('Check your Instagram profile before discarding this post. Discard it now?')) {
                    savePrepared(null);
                    setError('');
                    setNotice('');
                  }
                }}>Discard prepared post</button>}
              </> : (
                <button type="button" className="admin-primary" disabled={busy || !account || !selected || !image || !caption.trim() || (!!file && !alt.trim())} onClick={() => run(prepare)}>
                  {busy ? 'Preparing…' : 'Prepare post'}
                </button>
              )}
            </div>
            {prepared && account && prepared.accountId !== account.id && <p role="alert">This post was prepared for a different Instagram account.</p>}
          </div>
        </section>
        <section className="admin-panel admin-form-panel" aria-labelledby="instagram-preview-title">
          <div className="admin-panel-heading"><h2 id="instagram-preview-title">Post preview</h2></div>
          {image && <img src={image} alt="" className="admin-instagram-photo" referrerPolicy="no-referrer"/>}
          <p className="admin-instagram-caption">{caption || 'Choose an article to start your post.'}</p>
        </section>
      </div>
    )}
  </>;
}

function postLink(permalink?: string, username?: string) {
  if (permalink) return <a href={permalink} target="_blank" rel="noreferrer">View post ↗</a>;
  return username ? <a href={`https://www.instagram.com/${username}/`} target="_blank" rel="noreferrer">View profile ↗</a> : null;
}
