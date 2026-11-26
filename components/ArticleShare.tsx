import {Instagram} from 'lucide-react';
import Link from 'next/link';
import {absoluteUrl} from '../lib/seo';

export default function ArticleShare({slug, title, instagramHref}: {slug: string; title: string; instagramHref?: string}) {
  const url = absoluteUrl(`/articles/${encodeURIComponent(slug)}/`);
  const facebook = new URLSearchParams({u: url});
  const x = new URLSearchParams({url, text: title});
  return (
    <nav aria-label="Share article" className="article-share">
      <a className="article-social-icon facebook" href={`https://www.facebook.com/sharer/sharer.php?${facebook}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" title="Share on Facebook">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
          <path d="M14 21v-8h2.75l.4-3H14V8.1c0-.87.24-1.47 1.5-1.47h1.67V3.95C16.88 3.91 15.9 3.8 14.75 3.8c-2.4 0-4.05 1.47-4.05 4.17V10H8v3h2.7v8H14z"/>
        </svg>
      </a>
      <a className="article-social-icon x" href={`https://x.com/intent/tweet?${x}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
          <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.25l-4.9-7.39L5.6 22H2.49l7.25-8.29L2.06 2h6.4l4.43 6.69L18.9 2zM17.8 19.95h1.73L7.53 3.94H5.7l12.1 16.01z"/>
        </svg>
      </a>
      {instagramHref && <Link className="article-social-icon instagram" href={instagramHref} aria-label="Create Instagram post" title="Create Instagram post"><Instagram aria-hidden="true" focusable="false"/></Link>}
    </nav>
  );
}
