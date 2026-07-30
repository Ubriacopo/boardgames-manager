export type BggGameMetadata = {
  bggId: number;
  name: string;
  yearPublished: number | null;
  rank: number | null;
  avgRating: number | null;
  bayesAvgRating: number | null;
  usersRated: number | null;
  isExpansion: boolean;
  themes: string[];
  mechanics: string[];
  searchText: string;
};

export type BggReview = {
  username: string;
  rating: number | null;
  comment: string;
};

export type BggOverview = {
  description: string;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  minAge: number | null;
  complexity: number | null;
};

const BGG_GAME_ID_PATTERN = /boardgame\/(\d+)/;
let bggDataCache: Promise<Map<number, BggGameMetadata>> | null = null;

export function getBggGameId(bggUrl: string) {
  return Number(BGG_GAME_ID_PATTERN.exec(bggUrl)?.[1] ?? NaN) || null;
}

export async function getBggMetadataByIds(ids: number[]) {
  const allMetadata = await getAllBggMetadata();
  const metadataById = new Map<number, BggGameMetadata>();

  ids.forEach((id) => {
    const metadata = allMetadata.get(id);

    if (metadata) {
      metadataById.set(id, metadata);
    }
  });

  return metadataById;
}

export async function getBggCatalog() {
  return [...(await getAllBggMetadata()).values()];
}

export async function getBggReviews(bggId: number, limit = 5): Promise<BggReview[]> {
  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&ratingcomments=1&page=1`,
  );
  if (!response.ok) throw new Error('BGG reviews are temporarily unavailable.');
  const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
  return Array.from(xml.querySelectorAll('comments > comment')).slice(0, limit).map((comment) => ({
    username: comment.getAttribute('username') ?? 'BGG user',
    rating: toNumber(comment.getAttribute('rating') ?? undefined),
    comment: comment.getAttribute('value') ?? '',
  })).filter((review) => review.comment);
}

export async function getBggOverview(bggId: number): Promise<BggOverview> {
  const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
  if (!response.ok) throw new Error('BGG overview is temporarily unavailable.');
  const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
  const item = xml.querySelector('item');
  if (!item) throw new Error('BGG overview was not found.');
  const value = (selector: string) => toNumber(item.querySelector(selector)?.getAttribute('value') ?? undefined);
  const description = item.querySelector('description')?.textContent ?? '';
  return {
    description: description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
    imageUrl: item.querySelector('image')?.textContent?.trim() || null,
    minPlayers: value('minplayers'),
    maxPlayers: value('maxplayers'),
    minPlaytime: value('minplaytime'),
    maxPlaytime: value('maxplaytime'),
    minAge: value('minage'),
    complexity: value('statistics ratings averageweight'),
  };
}

export async function searchBggMetadataByName(query: string, limit = 20) {
  const allMetadata = await getAllBggMetadata();
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const matcher = createNameMatcher(normalizedQuery);
  const results: BggGameMetadata[] = [];

  for (const metadata of allMetadata.values()) {
    if (matcher.test(metadata.name)) {
      results.push(metadata);
    }

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function getAllBggMetadata() {
  bggDataCache ??= loadAllBggMetadata();

  return bggDataCache;
}

async function loadAllBggMetadata() {
  const gamesRows = await fetchCsv('/bgg-data/boardgames_ranks.csv');
  const metadataById = new Map<number, BggGameMetadata>();

  gamesRows.forEach((row) => {
    const bggId = toNumber(row['id']);

    if (bggId === null) {
      return;
    }

    const themes = getRankTags(row);
    const mechanics: string[] = [];
    const name = row['name'] ?? '';

    metadataById.set(bggId, {
      bggId,
      name,
      yearPublished: toNumber(row['yearpublished']),
      rank: toNumber(row['rank']),
      avgRating: toNumber(row['average']),
      bayesAvgRating: toNumber(row['bayesaverage']),
      usersRated: toNumber(row['usersrated']),
      isExpansion: row['is_expansion'] === '1',
      themes,
      mechanics,
      searchText: [name, ...themes, ...mechanics].join(' ').toLowerCase(),
    });
  });

  return metadataById;
}

async function fetchCsv(path: string) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }

  return parseCsv(await response.text());
}

function getRankTags(row: Record<string, string>) {
  return [
    ['abstracts_rank', 'Abstract'],
    ['cgs_rank', 'Card game'],
    ['childrensgames_rank', "Children's"],
    ['familygames_rank', 'Family'],
    ['partygames_rank', 'Party'],
    ['strategygames_rank', 'Strategy'],
    ['thematic_rank', 'Thematic'],
    ['wargames_rank', 'War'],
  ]
    .filter(([field]) => Boolean(row[field]))
    .map(([, label]) => label);
}

function createNameMatcher(query: string) {
  try {
    return new RegExp(query, 'i');
  } catch {
    return new RegExp(escapeRegExp(query), 'i');
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function parseCsv(csv: string) {
  const rows = parseCsvRows(csv.trim());
  const headers = rows[0] ?? [];

  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = row[index] ?? '';

      return record;
    }, {}),
  );
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let isQuoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === ',' && !isQuoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !isQuoted) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value);
  rows.push(row);

  return rows;
}
