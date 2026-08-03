// Memoire de categorie : la categorie d'une nouvelle depense est devinee a
// partir des depenses passees portant un libelle proche. « KFC » retrouve la
// categorie mise la derniere fois qu'on a tape « KFC », sans table de mots-cles
// a maintenir — l'historique EST la configuration.

export type CategoryHistoryEntry = { name: string; category: string; count: number };

const STOPWORDS = new Set([
  'a',
  'au',
  'aux',
  'avec',
  'chez',
  'de',
  'des',
  'du',
  'en',
  'et',
  'la',
  'le',
  'les',
  'par',
  'pour',
  'sur',
  'un',
  'une',
]);

const EXACT_SCORE = 10;
const TOKEN_SCORE = 3;
const PREFIX_SCORE = 2;
const MIN_SCORE = 2;
const MIN_PREFIX_LENGTH = 3;

export const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const tokenize = (text: string): string[] =>
  normalizeText(text)
    .split(' ')
    .filter((word) => 1 < word.length && !STOPWORDS.has(word));

export const suggestCategory = (
  description: string,
  history: CategoryHistoryEntry[],
): string | null => {
  const queryTokens = tokenize(description);
  if (!queryTokens.length) {
    return null;
  }

  const query = normalizeText(description);
  let best: { category: string; score: number; count: number } | null = null;

  for (const entry of history) {
    const entryName = normalizeText(entry.name);
    if (!entryName) {
      continue;
    }

    const entryTokens = tokenize(entry.name);
    let score = entryName === query ? EXACT_SCORE : 0;

    for (const token of queryTokens) {
      if (entryTokens.includes(token)) {
        score += TOKEN_SCORE;
      } else if (
        MIN_PREFIX_LENGTH <= token.length &&
        entryTokens.some((candidate) => candidate.startsWith(token))
      ) {
        score += PREFIX_SCORE;
      }
    }

    if (MIN_SCORE > score) {
      continue;
    }

    // A score egal, l'habitude tranche : la categorie la plus souvent utilisee
    // avec ce libelle gagne.
    if (!best || score > best.score || (score === best.score && entry.count > best.count)) {
      best = { category: entry.category, score, count: entry.count };
    }
  }

  return best?.category ?? null;
};
