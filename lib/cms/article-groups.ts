export const articleRoles = ['standalone', 'main', 'child'] as const;
export type ArticleRole = typeof articleRoles[number];

export type ArticleGroupFields = {
  articleRole?: ArticleRole;
  parentArticleId?: string;
  childOrder?: number | null;
};

export function compareChildOrder(a: ArticleGroupFields, b: ArticleGroupFields) {
  return (a.childOrder ?? Number.MAX_SAFE_INTEGER) - (b.childOrder ?? Number.MAX_SAFE_INTEGER);
}

export function indexArticleGroups<T extends ArticleGroupFields & {id?: string}>(articles: readonly T[]) {
  const mains = new Map<string, T>();
  const childrenByMain = new Map<string, T[]>();
  for (const article of articles) {
    if (article.articleRole === 'main' && article.id) mains.set(article.id, article);
  }

  function mainFor(article: T) {
    return article.articleRole === 'child' && article.parentArticleId
      ? mains.get(article.parentArticleId)
      : undefined;
  }

  for (const article of articles) {
    const main = mainFor(article);
    if (!main?.id) continue;
    const children = childrenByMain.get(main.id) ?? [];
    children.push(article);
    childrenByMain.set(main.id, children);
  }

  for (const children of childrenByMain.values()) children.sort(compareChildOrder);

  return {
    mainFor,
    childrenFor: (article: T): readonly T[] => article.id ? childrenByMain.get(article.id) ?? [] : [],
    topLevel: articles.filter(article => !mainFor(article)),
  };
}
