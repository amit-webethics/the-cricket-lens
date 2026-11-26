export const MAX_DRAFT_MARKDOWN_BYTES = 500_000;
export const MAX_DRAFT_IMPORT_ARTICLES = 30;

export const draftMarkdownTemplate = `# Example Cricket Series

## 1. An original article headline

**URL slug**
an-original-article-headline

**Short introduction**
Write a short introduction for the article.

**SEO description**
Write a short description for search results.

**Tags**
Test Cricket, Analysis

**Reading time**
3 minutes

### Opening section

Write your first paragraph here.

Leave a blank line before each new paragraph.

### Sources and notes

- [Source name](https://example.com/source)

---

## 2. A second article headline

**Short introduction**
Introduce your second article here.

### Opening section

Write your article here.
`;

export class DraftMarkdownError extends Error {}

type Section = {heading: string; body: string[]};
type Source = {label: string; url: string};

export type MarkdownArticle = {
  title: string;
  slug?: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  minutes?: number;
  sections: Section[];
  sources: Source[];
};

function plainText(value: string) {
  return value.trim().replace(/(\*{1,2})([^*\n]+)\1/g, '$2');
}

function readFields(text: string, error: (message: string) => never) {
  const supported = new Set(['url slug', 'short introduction', 'seo title', 'seo description', 'tags', 'reading time']);
  const labels = [...text.matchAll(/^\*\*([^*\n]+)\*\*[ \t]*:?[ \t]*(.*)$/gm)];
  if (text.slice(0, labels[0]?.index ?? text.length).trim()) {
    error('Place the introduction and other fields under bold labels before the first body section.');
  }

  const fields = new Map<string, string>();
  labels.forEach((label, index) => {
    const name = label[1].trim().replace(/:$/, '').toLowerCase();
    if (!supported.has(name)) error(`The “${label[1]}” field is not supported.`);
    if (fields.has(name)) error(`The “${label[1]}” field appears twice.`);
    const continuation = text.slice(label.index + label[0].length, labels[index + 1]?.index);
    fields.set(name, plainText(`${label[2]}${continuation}`));
  });

  return fields;
}

function readArticle(title: string, text: string, tableSlug?: string): MarkdownArticle {
  const error = (message: string): never => {throw new DraftMarkdownError(`${title} — ${message}`);};
  const sections: Section[] = [];
  const sources: Source[] = [];
  const [fieldsText, ...parts] = text.split(/^###[ \t]+(.+)$/gm);
  const fields = readFields(fieldsText, error);
  const description = fields.get('short introduction');
  if (!description) return error('Add a Short introduction.');

  const readingTime = fields.get('reading time');
  const minutes = readingTime ? /^(\d+)(?:[ \t]+(?:min|minutes?))?\.?$/i.exec(readingTime) : null;
  if (readingTime && !minutes) return error('Enter reading time as a number of minutes.');

  for (let index = 0; index < parts.length; index += 2) {
    const heading = plainText(parts[index]);
    const body = parts[index + 1].trim();
    if (/^sources(?:\s+(?:and|&)\s+(?:notes|corrections))?$/i.test(heading)) {
      for (const line of body.split('\n').filter(line => line.trim())) {
        const link = /^\s*[-*]\s+\[(.+)\]\((https:\/\/\S+)\)\s*$/.exec(line);
        if (!link) return error('Write each source as a Markdown list item with an HTTPS link.');
        sources.push({label: link[1], url: link[2]});
      }
    } else {
      if (!body) return error(`Add text under “${heading}”.`);
      sections.push({heading, body: body.split(/\n[ \t]*\n+/).map(plainText)});
    }
  }
  if (sections.length === 0) return error('Add at least one body section with a level-three heading (###).');

  return {
    title,
    slug: fields.get('url slug') || tableSlug,
    description,
    seoTitle: fields.get('seo title'),
    seoDescription: fields.get('seo description'),
    tags: (fields.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean),
    minutes: minutes ? Number(minutes[1]) : undefined,
    sections,
    sources,
  };
}

export function parseDraftMarkdown(markdown: string) {
  const text = markdown.replace(/\r\n?/g, '\n').trim();
  const headings = [...text.matchAll(/^##[ \t]+([1-9]\d*)\.[ \t]+(.+)$/gm)];
  if (!headings.length) throw new DraftMarkdownError('Start each article with a numbered heading such as “## 1. Article headline”.');
  if (headings.length > MAX_DRAFT_IMPORT_ARTICLES) {
    throw new DraftMarkdownError(`Import up to ${MAX_DRAFT_IMPORT_ARTICLES} articles in one file.`);
  }

  const frontMatter = text.slice(0, headings[0].index);
  const series = plainText(/^#[ \t]+(.+)$/m.exec(frontMatter)?.[1] ?? '');
  const slugs = new Map<string, string>();
  for (const [, number, slug] of frontMatter.matchAll(/^\|[ \t]*(\d+)[ \t]*\|[^|\n]*\|[ \t]*([a-z0-9-]+)[ \t]*\|[ \t]*$/gm)) {
    slugs.set(number, slug);
  }

  const numbers = new Set<string>();
  const articles = headings.map((heading, index) => {
    const [, number, title] = heading;
    if (numbers.has(number)) throw new DraftMarkdownError(`Article number ${number} appears twice.`);
    numbers.add(number);
    const body = text.slice(heading.index + heading[0].length, headings[index + 1]?.index);
    return readArticle(plainText(title), body.replace(/\n[ \t]*---[ \t]*\s*$/, ''), slugs.get(number));
  });

  return {series, articles};
}
