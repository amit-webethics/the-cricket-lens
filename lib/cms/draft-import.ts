import {z} from 'zod';
import {createContentStore, database} from './db';
import {
  DraftMarkdownError,
  MAX_DRAFT_IMPORT_ARTICLES,
  MAX_DRAFT_MARKDOWN_BYTES,
  parseDraftMarkdown,
  importedArticleContent,
} from './draft-markdown';
import {wordCount} from './news';
import {schemas, slugify} from './schema';

const inputFields = {
  markdown: z.string().min(1).max(MAX_DRAFT_MARKDOWN_BYTES),
  categoryId: z.uuid().optional(),
  authorId: z.uuid().optional(),
  mode: z.enum(['create', 'update']).default('create'),
};

const draftImportInput = z.discriminatedUnion('action', [
  z.object({...inputFields, action: z.literal('preview')}),
  z.object({
    ...inputFields,
    action: z.literal('import'),
    slugs: z.array(z.string().min(1).max(180)).min(1).max(MAX_DRAFT_IMPORT_ARTICLES),
    revisions: z.record(z.string(), z.number().int().positive()).optional(),
  }),
]);

export async function handleDraftImport(request: Request) {
  // JSON encoding can expand the source, so check the decoded file as well.
  if (Number(request.headers.get('content-length')) > 3_100_000) {
    return {data: {error: 'Choose a Markdown file no larger than 500 KB.'}, status: 413};
  }

  try {
    const input = draftImportInput.parse(await request.json());
    if (Buffer.byteLength(input.markdown) > MAX_DRAFT_MARKDOWN_BYTES) {
      return {data: {error: 'Choose a Markdown file no larger than 500 KB.'}, status: 413};
    }

    if (input.mode === 'create' && (!input.categoryId || !input.authorId)) {
      return {data: {error: 'Choose a category and author for new drafts.'}, status: 400};
    }
    // Update validation only needs the editorial fields. Existing ownership is preserved.
    const nilId = '00000000-0000-0000-0000-000000000000';
    const {series, articles} = parseDraftMarkdown(input.markdown);
    const slugs = new Set<string>();
    const drafts = articles.map(article => {
      if (input.mode === 'update' && !article.slug) {
        throw new DraftMarkdownError(`Add the current URL slug for “${article.title}” before updating it.`);
      }
      const slug = article.slug || slugify(article.title).slice(0, 180).replace(/-$/, '');
      if (slugs.has(slug)) throw new DraftMarkdownError(`The URL slug “${slug}” appears more than once. Give each article a unique slug.`);
      slugs.add(slug);
      const words = article.sections.reduce((total, section) => total + wordCount(section.body.join(' ')), 0);
      const validated = schemas.articles.safeParse({
        ...article,
        slug,
        series,
        status: 'draft',
        categoryId: input.categoryId ?? nilId,
        authorId: input.authorId ?? nilId,
        seoTitle: article.seoTitle ?? (article.title.length <= 70 ? article.title : ''),
        minutes: article.minutes ?? Math.max(1, Math.ceil(words / 200)),
      });
      if (!validated.success) {
        const issues = validated.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
        throw new DraftMarkdownError(`${article.title}\n${issues}`);
      }
      return {draft: validated.data, patch: importedArticleContent({...article, minutes: validated.data.minutes})};
    });

    const store = createContentStore(database());
    if (input.action === 'preview') {
      const matches = await store.articleImportMatches([...slugs]);
      return {data: {series, articles: drafts.map(item => item.draft), matches}, status: 200};
    }

    const selected = new Set(input.slugs);
    if (selected.size !== input.slugs.length || input.slugs.some(slug => !slugs.has(slug))) {
      return {data: {error: 'Preview the file again and select the articles to import.'}, status: 400};
    }

    const chosen = drafts.filter(item => selected.has(item.draft.slug));
    if (input.mode === 'update') {
      const revisions = input.revisions;
      if (!revisions || chosen.some(({draft}) => !Object.hasOwn(revisions, draft.slug))) {
        return {data: {error: 'Preview the file again before updating matching articles.'}, status: 400};
      }
      const updated = await store.updateImportedArticles(chosen.map(({draft, patch}) => ({
        slug: draft.slug, revision: revisions[draft.slug], content: patch,
      })));
      return {data: {updated, imported: [], skipped: []}, status: 200};
    }
    const result = await store.importArticleDrafts(chosen.map(item => item.draft), input.categoryId!, input.authorId!);
    return {data: result, status: result.imported.length ? 201 : 200};
  } catch (error) {
    if (error instanceof DraftMarkdownError) return {data: {error: error.message}, status: 400};
    if (error instanceof SyntaxError) return {data: {error: 'Choose a Markdown file and try again.'}, status: 400};
    throw error;
  }
}
