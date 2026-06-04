import { useEffect, useState } from 'react';
import type { BggGameMetadata } from '../utils/bggData';
import { searchBggMetadataByName } from '../utils/bggData';

type AddGameDialogProps = {
  isOpen: boolean;
  existingBggIds: Array<number | null>;
  onClose: () => void;
  onAddGame: (game: BggGameMetadata) => Promise<void>;
};

export function AddGameDialog({
  isOpen,
  existingBggIds,
  onClose,
  onAddGame,
}: AddGameDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BggGameMetadata[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [addingBggId, setAddingBggId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setErrorMessage(null);
      setIsSearching(false);
      setAddingBggId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }

    let isCancelled = false;

    async function searchGames() {
      setIsSearching(true);
      setErrorMessage(null);

      try {
        const nextResults = await searchBggMetadataByName(query);

        if (!isCancelled) {
          setResults(nextResults);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to search local game data.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => void searchGames(), 180);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, query]);

  if (!isOpen) {
    return null;
  }

  async function addGame(game: BggGameMetadata) {
    setAddingBggId(game.bggId);
    setErrorMessage(null);

    try {
      await onAddGame(game);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add game.');
    } finally {
      setAddingBggId(null);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="add-game-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-game-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">Local BGG data</p>
            <h2 id="add-game-title">Add game</h2>
          </div>

          <button type="button" className="dialog-close-button" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="game-search-field">
          Search by name
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. ^Brass|Gloomhaven"
            autoFocus
          />
        </label>

        {errorMessage && <p className="error">{errorMessage}</p>}
        {isSearching && <p className="muted">Searching...</p>}

        <ul className="add-game-results">
          {results.map((game) => {
            const isExisting = existingBggIds.includes(game.bggId);

            return (
              <li key={game.bggId}>
                <article>
                  <div className="game-cover">
                    <span>{game.name.slice(0, 1)}</span>
                  </div>

                  <div>
                    <strong>{game.name}</strong>
                    <span>
                      {game.yearPublished ?? 'Unknown year'} · BGG {game.bggId}
                      {game.avgRating ? ` · ${game.avgRating.toFixed(1)}` : ''}
                      {game.rank ? ` · rank #${game.rank}` : ''}
                    </span>
                    {game.themes.length > 0 && (
                      <p className="game-themes">{game.themes.slice(0, 3).join(' · ')}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isExisting || addingBggId === game.bggId}
                    onClick={() => void addGame(game)}
                  >
                    {isExisting ? 'Added' : addingBggId === game.bggId ? 'Adding' : 'Add'}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
