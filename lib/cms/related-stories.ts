type Story = {
  slug: string;
  series?: string;
  tags?: readonly string[];
  team?: string;
  category?: string;
};

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

export function selectRelatedStories<T extends Story>(story: T, candidates: readonly T[], grouped: readonly T[] = []) {
  const series = normalize(story.series);
  const team = normalize(story.team);
  const category = normalize(story.category);
  const tags = new Set((story.tags ?? []).map(normalize).filter(Boolean));
  const ranked = candidates.map(candidate => ({
    candidate,
    sameSeries: Number(!!series && normalize(candidate.series) === series),
    sharedTags: [...new Set((candidate.tags ?? []).map(normalize))].filter(tag => tags.has(tag)).length,
    sameTeam: Number(!!team && normalize(candidate.team) === team),
    sameCategory: Number(!!category && normalize(candidate.category) === category),
  })).sort((a, b) =>
    b.sameSeries - a.sameSeries || b.sharedTags - a.sharedTags ||
    b.sameTeam - a.sameTeam || b.sameCategory - a.sameCategory,
  );

  const seen = new Set([story.slug]);
  return [...grouped, ...ranked.map(entry => entry.candidate)].filter(candidate => {
    if (seen.has(candidate.slug)) return false;
    seen.add(candidate.slug);
    return true;
  }).slice(0, 6);
}
