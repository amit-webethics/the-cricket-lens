export const DEFAULT_BRAND_COLOR = '#33319c';
export const brandColorPattern = /^#[0-9a-f]{6}$/i;

function mix(color: string, target: number, weight: number) {
  const channels = color.slice(1).match(/../g)!;
  return '#' + channels.map(channel => Math.round(parseInt(channel, 16) * weight + target * (1 - weight)).toString(16).padStart(2, '0')).join('');
}

function luminance(color: string) {
  const [red, green, blue] = color.slice(1).match(/../g)!.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function foreground(color: string) {
  return luminance(color) > 0.179 ? '#000' : '#fff';
}

export function brandColorStyle(value: unknown) {
  if (typeof value !== 'string' || !brandColorPattern.test(value)) return undefined;
  const color = value.toLowerCase();
  if (color === DEFAULT_BRAND_COLOR) return undefined;

  let ink = color;
  while (luminance(ink) > 0.15) ink = mix(ink, 0, 0.9);
  const nav = mix(color, 0, 0.86);
  const hover = mix(color, 0, 0.75);
  return {
    '--brand': color,
    '--navy': color,
    '--green': ink,
    '--brand-ink': ink,
    '--on-brand': foreground(color),
    '--brand-nav': nav,
    '--on-brand-nav': foreground(nav),
    '--brand-hover': hover,
    '--on-brand-hover': foreground(hover),
    '--brand-logo-accent': foreground(color),
    '--brand-dark-link': mix(color, 255, 0.3),
  };
}
