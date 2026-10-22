export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Bounded Damerau-Levenshtein also handles adjacent typing transpositions.
function similar(left: string, right: string): boolean {
  const limit = left.length >= 8 ? 2 : 1;
  if (left.length < 4 || Math.abs(left.length - right.length) > limit) return false;
  let previousPrevious: number[] = [];
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        current[j] = Math.min(current[j], previousPrevious[j - 2] + 1);
      }
    }
    if (Math.min(...current) > limit) return false;
    previousPrevious = previous;
    previous = current;
  }
  return previous[right.length] <= limit;
}

export function makeSearchScorer(value: string): (candidate: string) => number {
  const query = normalizeSearch(value);
  const tokens = query.split(' ').filter(Boolean);
  const fuzzyMatches = tokens.map(() => new Map<string, boolean>());
  return (candidate: string) => {
    if (!query) return 1;
    const text = normalizeSearch(candidate);
    if (text === query) return 100;
    if (text.startsWith(query)) return text[query.length] === ' ' ? 90 : 85;
    if (text.includes(query)) return 80;
    const words = text.split(' ');
    let fuzzy = false;
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      if (words.some(word => word.startsWith(token))) continue;
      if (!words.some(word => {
        const cached = fuzzyMatches[index].get(word);
        if (cached !== undefined) return cached;
        const match = similar(token, word);
        fuzzyMatches[index].set(word, match);
        return match;
      })) return 0;
      fuzzy = true;
    }
    return fuzzy ? 40 : 60;
  };
}
