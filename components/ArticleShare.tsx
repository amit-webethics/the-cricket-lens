import {ExternalLink} from 'lucide-react';
import {absoluteUrl} from '../lib/seo';

export default function ArticleShare({slug, title}: {slug: string; title: string}) {
  const url = absoluteUrl(`/articles/${encodeURIComponent(slug)}/`);
  const facebook = new URLSearchParams({u: url});
  const x = new URLSearchParams({url, text: title});
  return (
    <nav aria-label="Share article" className="article-share">
      <a href={`https://www.facebook.com/sharer/sharer.php?${facebook}`} target="_blank" rel="noopener noreferrer">
        <span className="sr-only">Share on </span>Facebook <ExternalLink size={13} aria-hidden="true"/>
      </a>
      <a href={`https://x.com/intent/tweet?${x}`} target="_blank" rel="noopener noreferrer">
        <span className="sr-only">Share on </span>X <ExternalLink size={13} aria-hidden="true"/>
      </a>
    </nav>
  );
}
