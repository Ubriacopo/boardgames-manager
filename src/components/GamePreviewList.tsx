import type {BoardGame} from '../entities/BoardGame';
import type {ContainerBox} from '../entities/ContainerBox';
import type { BggGameMetadata } from '../utils/bggData';

type GamePreviewListProps = {
    selectedBox: ContainerBox | null;
    games: BoardGame[];
    usedCapacity: number;
    selectedGameId: string | null;
    bggMetadataByGameId: Record<string, BggGameMetadata>;
    onSelectGame: (gameId: string) => void;
    onRemoveGame: (gameId: string) => void;
    onSellGame: (gameId: string) => void;
};

export function GamePreviewList({
                                    selectedBox,
                                    games,
                                    usedCapacity,
                                    selectedGameId,
                                    bggMetadataByGameId,
                                    onSelectGame,
                                    onRemoveGame,
                                    onSellGame,
                                }: GamePreviewListProps) {
    const capacity = selectedBox?.capacity ?? 0;

    return (
        <aside className="game-preview-panel">
            <p className="eyebrow">
                {selectedBox?.description ?? (selectedBox ? `#${selectedBox.id}` : 'No cube')}
            </p>
            <h2>Games preview</h2>
            {selectedBox && (
                <p className="capacity-summary">
                    {usedCapacity}/{capacity ?? 0} capacity used
                </p>
            )}

            {!selectedBox ? (
                <p className="muted">Select a cube to preview its games.</p>
            ) : games.length === 0 ? (
                <p className="muted">No games in this cube.</p>
            ) : (
                <ul className="game-preview-list">
                    {games.map((game) => (
                        <li key={game.id}>
                            <GamePreviewCard
                                game={game}
                                metadata={bggMetadataByGameId[game.id]}
                                isSelected={selectedGameId === game.id}
                                onSelectGame={onSelectGame}
                                onRemoveGame={onRemoveGame}
                                onSellGame={onSellGame}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}

function GamePreviewCard({
                             game,
                             metadata,
                             isSelected,
                             onSelectGame,
                             onRemoveGame,
                             onSellGame,
                         }: {
    game: BoardGame;
    metadata: BggGameMetadata | undefined;
    isSelected: boolean;
    onSelectGame: (gameId: string) => void;
    onRemoveGame: (gameId: string) => void;
    onSellGame: (gameId: string) => void;
}) {
    const rating = metadata?.avgRating;
    const subtitle = metadata?.themes.slice(0, 3).join(' · ');

    return (
        <article
            className={`game-preview-card${isSelected ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelectGame(game.id)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectGame(game.id);
                }
            }}
        >
            <div className="game-cover">
                {game.image_url ? (
                    <img src={game.image_url} alt="" loading="lazy"/>
                ) : (
                    <span>{game.name.slice(0, 1)}</span>
                )}
            </div>

            <div>
                <div className="game-card-heading">
                    <a
                        href={game.bgg_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {game.name}
                    </a>
                    <span className="game-card-actions">
                        {typeof rating === 'number' && (
                            <span className={`rating-chip ${getRatingClassName(rating)}`}>
                                {rating.toFixed(1)}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemoveGame(game.id);
                            }}
                        >
                            Remove
                        </button>
                        <button
                            type="button"
                            className="sell-game-button"
                            aria-label={`Sell ${game.name}`}
                            title="Sell game"
                            onClick={(event) => {
                                event.stopPropagation();
                                onSellGame(game.id);
                            }}
                        >
                            $
                        </button>
                    </span>
                </div>

                <span>
                    {game.release_year} · size {game.size}
                    {metadata?.rank ? ` · rank #${metadata.rank}` : ''}
                    {metadata?.usersRated ? ` · ${metadata.usersRated.toLocaleString()} ratings` : ''}
                </span>

                {subtitle && <p className="game-themes">{subtitle}</p>}

                {metadata?.mechanics.length ? (
                    <ul className="mechanics-list">
                        {metadata.mechanics.slice(0, 6).map((mechanic) => (
                            <li key={mechanic}>{mechanic}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
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
