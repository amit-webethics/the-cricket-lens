export type StoryKind = 'articles' | 'news' | 'review';

export interface StoryMetadata {
  title: string;
  summary?: string;
  tags?: string;
  url?: string;
  suggestedType?: string;
  sourceCategory?: string;
}

function classify(value: string): { kind: StoryKind; category: string } | undefined {
  if (/\b(previews?|predictions?)\b/i.test(value)) return { kind: 'articles', category: 'Match Previews' };
  if (/\b(match reports?|reviews?|highlights)\b/i.test(value)) return { kind: 'articles', category: 'Match Reports' };
  if (/\bplayer (analysis|profiles?)\b/i.test(value)) return { kind: 'articles', category: 'Player Analysis' };
  if (/\b(opinions?|analysis|columns?|explainers?|blogs?|features?|interviews?)\b/i.test(value)) {
    return { kind: 'articles', category: 'Opinions & Explainers' };
  }
  if (/\b(news|announcements?|squads?|injur(?:y|ies|ed)|appointed|retirement|retires|signs|signed|ruled out|withdraws)\b/i.test(value)) {
    return { kind: 'news', category: '' };
  }
}

export function classifyStory(story: StoryMetadata): { kind: StoryKind; category: string; reason: string } {
  const evidence = [
    [story.sourceCategory || '', 'Source category'],
    [story.tags || '', 'Source tags'],
    [/^news$/i.test(story.suggestedType || '') ? '' : story.suggestedType || '', 'Collector suggestion'],
    [story.title, 'Headline'],
    [story.url ? new URL(story.url).pathname.replace(/[-_/]/g, ' ') : '', 'Source URL'],
    [story.summary || '', 'Source summary'],
  ];
  for (const [value, reason] of evidence) {
    const result = classify(value);
    if (result) return { ...result, reason };
  }
  return { kind: 'review', category: '', reason: 'Insufficient source metadata' };
}

function shorten(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const prefix = clean.slice(0, limit - 1);
  const lastSpace = prefix.lastIndexOf(' ');
  return (lastSpace > limit / 2 ? prefix.slice(0, lastSpace) : prefix).trimEnd() + '…';
}

export function suggestDraftMetadata(story: StoryMetadata) {
  const content = `${story.title} ${story.summary || ''}`;
  const tags = new Map<string, string>();
  for (const value of (story.tags || '').split(/[,;|]/)) {
    const tag = value.trim();
    if (tag.length >= 2 && tag.length <= 50 && !tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
  }
  if (tags.size === 0) {
    const topics = ['IPL', 'WPL', 'T20I', 'T20', 'ODI', 'Test cricket', 'World Cup', 'Champions Trophy', 'The Ashes'];
    for (const topic of topics) {
      const pattern = topic === 'Test cricket' ? /\btests? (?:cricket|series|match(?:es)?|squad)\b/i : new RegExp(`\\b${topic}\\b`, 'i');
      if (pattern.test(content)) tags.set(topic.toLowerCase(), topic);
    }
  }
  return {
    tags: [...tags.values()].slice(0, 20),
    seoTitle: shorten(story.title, 70),
    seoDescription: shorten(story.summary?.trim() || story.title, 180),
  };
}
