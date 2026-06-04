import type { BoardGame } from '../entities/BoardGame';
import type { BggGameMetadata } from '../utils/bggData';

type UnassignedGamesListProps = {
  games: BoardGame[];
  isOpen: boolean;
  selectedGameId: string | null;
  bggMetadataByGameId: Record<string, BggGameMetadata>;
  onToggleOpen: () => void;
  onSelectGame: (gameId: string) => void;
};

export function UnassignedGamesList({
  games,
  isOpen,
  selectedGameId,
  bggMetadataByGameId,
  onToggleOpen,
  onSelectGame,
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
}: {
  game: BoardGame;
  metadata: BggGameMetadata | undefined;
  isSelected: boolean;
  onSelectGame: (gameId: string) => void;
}) {
  const rating = metadata?.avgRating?.toFixed(1);
  const subtitle = metadata?.themes.slice(0, 2).join(' · ');

  return (
    <button
      type="button"
      className={`unassigned-game${isSelected ? ' is-selected' : ''}`}
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

      <small>{rating ? `${rating} · ${game.release_year}` : game.release_year}</small>
    </button>
  );
}
