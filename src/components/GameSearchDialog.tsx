import { useMemo, useState } from 'react';
import type { BoardGame } from '../entities/BoardGame';
import type { ContainerBox } from '../entities/ContainerBox';
import type { BggGameMetadata } from '../utils/bggData';

type GameSearchDialogProps = {
  isOpen: boolean;
  games: BoardGame[];
  boxes: ContainerBox[];
  bggMetadataByGameId: Record<string, BggGameMetadata>;
  onClose: () => void;
  onSelectGame: (gameId: string) => void;
};

export function GameSearchDialog({
  isOpen,
  games,
  boxes,
  bggMetadataByGameId,
  onClose,
  onSelectGame,
}: GameSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(
    () => getCategories(games, bggMetadataByGameId),
    [games, bggMetadataByGameId],
  );
  const results = useMemo(
    () => searchOwnedGames(games, bggMetadataByGameId, query, category),
    [games, bggMetadataByGameId, query, category],
  );

  if (!isOpen) {
    return null;
  }

  function selectGame(gameId: string) {
    onSelectGame(gameId);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="game-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-search-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">Owned library</p>
            <h2 id="game-search-title">Find a game</h2>
          </div>

          <button type="button" className="dialog-close-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="game-search-controls">
          <label className="game-search-field">
            Search title
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Brass|Ark Nova"
              autoFocus
            />
          </label>

          <label className="game-search-field">
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((nextCategory) => (
                <option key={nextCategory} value={nextCategory}>
                  {nextCategory}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="muted">
          {results.length} of {games.length} games
        </p>

        <ul className="game-search-results">
          {results.map((game) => {
            const metadata = bggMetadataByGameId[game.id];
            const box = boxes.find((candidateBox) => candidateBox.id === game.box);
            const location = box ? box.description ?? `#${box.id}` : 'Unassigned';
            const categoriesText = [...(metadata?.themes ?? []), ...(metadata?.mechanics ?? [])]
              .slice(0, 4)
              .join(' · ');

            return (
              <li key={game.id}>
                <button type="button" onClick={() => selectGame(game.id)}>
                  <span className="game-search-result-title">{game.name}</span>
                  <span>{game.release_year} · {location}</span>
                  {categoriesText && <small>{categoriesText}</small>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function searchOwnedGames(
  games: BoardGame[],
  bggMetadataByGameId: Record<string, BggGameMetadata>,
  query: string,
  category: string,
) {
  const matcher = createTitleMatcher(query.trim());
  const normalizedCategory = category.toLowerCase();

  return games.filter((game) => {
    const metadata = bggMetadataByGameId[game.id];
    const categories = [...(metadata?.themes ?? []), ...(metadata?.mechanics ?? [])];
    const matchesTitle = matcher ? matcher.test(game.name) : true;
    const matchesCategory = normalizedCategory
      ? categories.some((nextCategory) => nextCategory.toLowerCase() === normalizedCategory)
      : true;

    return matchesTitle && matchesCategory;
  });
}

function getCategories(
  games: BoardGame[],
  bggMetadataByGameId: Record<string, BggGameMetadata>,
) {
  return Array.from(
    new Set(
      games.flatMap((game) => {
        const metadata = bggMetadataByGameId[game.id];

        return [...(metadata?.themes ?? []), ...(metadata?.mechanics ?? [])];
      }),
    ),
  ).sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory));
}

function createTitleMatcher(query: string) {
  if (!query) {
    return null;
  }

  try {
    return new RegExp(query, 'i');
  } catch {
    return new RegExp(escapeRegExp(query), 'i');
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
