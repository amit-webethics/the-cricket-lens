import {brandColorPattern, brandColorStyle, DEFAULT_BRAND_COLOR} from '../../../lib/brand-color';

export function generateStaticParams() {
  return [{color: DEFAULT_BRAND_COLOR.slice(1)}];
}

export async function GET(_: Request, {params}: {params: Promise<{color: string}>}) {
  const {color: code} = await params;
  const color = `#${code}`;
  if (!brandColorPattern.test(color)) return new Response('Icon not found', {status: 404});

  const detail = brandColorStyle(color)?.['--on-brand'] || '#fff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="25" fill="${color}"/><path d="M20 41h22l10-13h28l10 13h18a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8V49a8 8 0 0 1 8-8Z" fill="none" stroke="${detail}" stroke-width="7" stroke-linejoin="round"/><rect x="27" y="32" width="19" height="9" rx="2" fill="${detail}"/><circle cx="64" cy="72" r="31" fill="#fff"/><circle cx="64" cy="72" r="26" fill="#c71932"/><path d="M49 51c10 17 21 28 37 35M43 59c10 17 21 28 37 35" fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round"/><path d="m53 57-5 5m12 2-5 5m12 2-5 5m12 2-5 5" stroke="#fff" stroke-width="2"/></svg>`;
  return new Response(svg, {headers: {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  }});
}
