import type { BoardGame } from '../entities/BoardGame';
import type { BggGameMetadata } from '../utils/bggData';

type UnassignedGamesListProps = {
  games: BoardGame[];
  isOpen: boolean;
  selectedGameId: string | null;
  bggMetadataByGameId: Record<string, BggGameMetadata>;
  onToggleOpen: () => void;
  onSelectGame: (gameId: string) => void;
  onSellGame: (gameId: string) => void;
};

export function UnassignedGamesList({
  games,
  isOpen,
  selectedGameId,
  bggMetadataByGameId,
  onToggleOpen,
  onSelectGame,
  onSellGame,
}: UnassignedGamesListProps) {
  return (
    <aside className="unassigned-games-panel">
      <button
        type="button"
        className="unassigned-toggle"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
      >
        <span>
          <span className="eyebrow">Unassigned</span>
          <strong>Games outside Kallax</strong>
        </span>
        <span>{games.length}</span>
      </button>

      {isOpen && games.length === 0 ? (
        <p className="muted">All games are placed in the shelf.</p>
      ) : isOpen ? (
        <ul className="unassigned-games-list">
          {games.map((game) => (
            <li key={game.id}>
              <UnassignedGameCard
                game={game}
                metadata={bggMetadataByGameId[game.id]}
                isSelected={selectedGameId === game.id}
                onSelectGame={onSelectGame}
                onSellGame={onSellGame}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

function UnassignedGameCard({
  game,
  metadata,
  isSelected,
  onSelectGame,
  onSellGame,
}: {
  game: BoardGame;
  metadata: BggGameMetadata | undefined;
  isSelected: boolean;
  onSelectGame: (gameId: string) => void;
  onSellGame: (gameId: string) => void;
}) {
  const rating = metadata?.avgRating;
  const subtitle = metadata?.themes.slice(0, 2).join(' · ');

  return (
    <article
      className={`unassigned-game${isSelected ? ' is-selected' : ''}`}
    >
      <button
        type="button"
        className="unassigned-game-main"
        draggable
        onClick={() => onSelectGame(game.id)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', game.id);
          onSelectGame(game.id);
        }}
      >
        <span className="unassigned-game-cover">
          {game.image_url ? (
            <img src={game.image_url} alt="" loading="lazy" />
          ) : (
            game.name.slice(0, 1)
          )}
        </span>

        <span className="unassigned-game-body">
          <span className="unassigned-game-title">{game.name}</span>
          {subtitle && <span className="unassigned-game-subtitle">{subtitle}</span>}
          {metadata?.mechanics.length ? (
            <span className="mechanics-list compact">
              {metadata.mechanics.slice(0, 3).map((mechanic) => (
                <span key={mechanic}>{mechanic}</span>
              ))}
            </span>
          ) : null}
        </span>

        <small className="unassigned-game-meta">
          {typeof rating === 'number' && (
            <span className={`rating-chip ${getRatingClassName(rating)}`}>
              {rating.toFixed(1)}
            </span>
          )}
          <span>{game.release_year}</span>
        </small>
      </button>

      <button
        type="button"
        className="sell-game-button"
        aria-label={`Sell ${game.name}`}
        title="Sell game"
        onClick={() => onSellGame(game.id)}
      >
        $
      </button>
    </article>
  );
}

function getRatingClassName(rating: number) {
  if (rating < 5) {
    return 'is-low';
  }

  if (rating < 7) {
    return 'is-mid';
  }

  if (rating > 8) {
    return 'is-top';
  }

  return 'is-high';
}
