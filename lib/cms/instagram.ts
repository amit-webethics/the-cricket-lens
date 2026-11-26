import {createHmac, timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {absoluteUrl, SITE_URL} from '../seo';
import {database} from './db';

const graphUrl = 'https://graph.instagram.com/v27.0/';
const instagramId = z.string().regex(/^\d{1,30}$/);
const graphId = z.union([instagramId, z.number().int().positive().transform(String)]);
const accountSchema = z.object({
  user_id: graphId,
  username: z.string().regex(/^[\w.]{1,30}$/),
});
const prepareSchema = z.object({
  articleId: z.uuid(),
  accountId: instagramId,
  caption: z.string().trim().min(1).max(2200),
  mediaId: z.uuid().optional(),
});
const publishSchema = z.object({
  accountId: instagramId,
  containerId: instagramId,
  proof: z.string().regex(/^[a-f0-9]{64}$/),
});

class InstagramError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function graph(token: string, path: string, params?: Record<string, string>) {
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(new URL(path, graphUrl), {
      method: params ? 'POST' : 'GET',
      headers: {Authorization: `Bearer ${token}`},
      body: params && new URLSearchParams(params),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    data = await response.json();
  } catch {
    throw new InstagramError('Instagram did not respond. Try again to check the same post.', 502);
  }
  if (!response.ok) {
    const code = z.object({error: z.object({code: z.number()})}).safeParse(data);
    if (code.success && code.data.error.code === 190) {
      throw new InstagramError('The Instagram token is invalid or expired. Replace it in Vercel.', 503);
    }
    if (code.success && [10, 200].includes(code.data.error.code)) {
      throw new InstagramError('Meta denied access. Check that the Instagram token has publishing permission.', 503);
    }
    throw new InstagramError('Instagram could not complete this request. Check the image or try again.', 502);
  }
  return data;
}

async function accountFor(token: string) {
  const account = accountSchema.safeParse(await graph(token, 'me?fields=user_id,username'));
  if (!account.success) throw new InstagramError('Meta could not identify the connected Instagram account.', 502);
  return {id: account.data.user_id, username: account.data.username};
}

async function resolvePhoto(articleId: string, mediaId?: string) {
  const sql = database();
  const [article] = await sql<{cover: string | null; alt: string | null}[]>`
    SELECT data->>'imageUrl' AS cover, data->>'imageAlt' AS alt FROM cms_records
    WHERE id=${articleId} AND kind='articles' AND status='published'
  `;
  if (!article) throw new InstagramError('Choose a published article.', 404);

  const uploadedCover = /^\/api\/media\/([^/]+)\/?$/.exec(article.cover || '')?.[1];
  const stored = mediaId || uploadedCover;
  if (stored && z.uuid().safeParse(stored).success) {
    const [image] = await sql<{mime_type: string; alt: string}[]>`
      SELECT mime_type,alt FROM cms_media WHERE id=${stored}
    `;
    if (image?.mime_type !== 'image/jpeg') throw new InstagramError('Choose a JPEG for the Instagram photo.', 400);
    return {url: absoluteUrl(`/api/media/${stored}`), alt: image.alt};
  }

  let url: URL | undefined;
  try {
    if (article.cover) url = new URL(article.cover, SITE_URL);
  } catch {
    // Invalid legacy cover URLs can be replaced with an upload.
  }
  if (!url || url.protocol !== 'https:' || url.username || url.password) {
    throw new InstagramError('Upload a JPEG for this article.', 400);
  }
  return {url: url.href, alt: article.alt};
}

function containerProof(token: string, accountId: string, containerId: string) {
  return createHmac('sha256', token).update(`instagram-publish:${accountId}:${containerId}`).digest('hex');
}

const result = (data: unknown, status = 200) => ({data, status});

export async function handleInstagram(req: Request, path: string[]) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  try {
    if (req.method === 'GET' && path.length === 1) {
      if (path[0] === 'account') return result({account: token ? await accountFor(token) : null});
      if (path[0] === 'articles') {
        const items = await database()`
          SELECT id,title,slug,COALESCE(data->>'description','') AS description,
            COALESCE(data->>'imageUrl','') AS cover
          FROM cms_records WHERE kind='articles' AND status='published'
          ORDER BY published_at DESC NULLS LAST, title
        `;
        return result({items});
      }
    }
    if (req.method !== 'POST' || path.length !== 1 || !['prepare', 'publish'].includes(path[0])) {
      return result({error: 'Instagram action not found.'}, 404);
    }
    if (!token) return result({error: 'Connect the Instagram account in Vercel first.'}, 503);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 16_384) return result({error: 'Instagram request is too large.'}, 413);
    const input: unknown = JSON.parse(raw);

    if (path[0] === 'prepare') {
      const {articleId, accountId, caption, mediaId} = prepareSchema.parse(input);
      const account = await accountFor(token);
      if (account.id !== accountId) throw new InstagramError('The connected Instagram account changed. Reload the composer.', 409);
      const photo = await resolvePhoto(articleId, mediaId);
      const payload = {image_url: photo.url, caption, ...(photo.alt && {alt_text: photo.alt.slice(0, 250)})};
      const media = z.object({id: instagramId}).safeParse(await graph(token, `${account.id}/media`, payload));
      if (!media.success) throw new InstagramError('Instagram did not return a post to publish.', 502);
      const containerId = media.data.id;
      return result({containerId, proof: containerProof(token, account.id, containerId)}, 201);
    }

    const {accountId, containerId, proof} = publishSchema.parse(input);
    if (!timingSafeEqual(Buffer.from(proof, 'hex'), Buffer.from(containerProof(token, accountId, containerId), 'hex'))) {
      throw new InstagramError('This prepared post was created with a different connection. Check your Instagram profile before starting again.', 409);
    }
    // Check the existing container on every attempt, including after a lost response from Meta.
    const state = z.object({status_code: z.enum(['EXPIRED', 'ERROR', 'FINISHED', 'IN_PROGRESS', 'PUBLISHED'])})
      .safeParse(await graph(token, `${containerId}?fields=status_code`));
    if (!state.success) throw new InstagramError('Instagram did not return the status of this post. Try again.', 502);
    const status = state.data.status_code;
    if (status !== 'FINISHED') return result({status});

    const post = z.object({id: instagramId}).safeParse(await graph(token, `${accountId}/media_publish`, {creation_id: containerId}));
    if (!post.success) throw new InstagramError('Instagram did not confirm the publish. Check again using the same post.', 502);
    const details = await graph(token, `${post.data.id}?fields=permalink`).catch(() => null);
    const permalink = z.object({
      permalink: z.url().refine(value => /^https:\/\/(www\.)?instagram\.com\//.test(value)),
    }).safeParse(details);
    return result({status: 'PUBLISHED', permalink: permalink.success ? permalink.data.permalink : null});
  } catch (error) {
    if (error instanceof InstagramError) return result({error: error.message}, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return result({error: 'Check the Instagram caption and selected image.'}, 400);
    throw error;
  }
}
