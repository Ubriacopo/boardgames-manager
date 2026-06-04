import type {BoardGame} from '../entities/BoardGame';
import type {ContainerBox} from '../entities/ContainerBox';
import type { BggGameMetadata } from '../utils/bggData';

type GamePreviewListProps = {
    selectedBox: ContainerBox | null;
    games: BoardGame[];
    usedCapacity: number;
    bggMetadataByGameId: Record<string, BggGameMetadata>;
    onRemoveGame: (gameId: string) => void;
};

export function GamePreviewList({
                                    selectedBox,
                                    games,
                                    usedCapacity,
                                    bggMetadataByGameId,
                                    onRemoveGame,
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
                                onRemoveGame={onRemoveGame}
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
                             onRemoveGame,
                         }: {
    game: BoardGame;
    metadata: BggGameMetadata | undefined;
    onRemoveGame: (gameId: string) => void;
}) {
    const rating = metadata?.avgRating?.toFixed(1);
    const subtitle = metadata?.themes.slice(0, 3).join(' · ');

    return (
        <article className="game-preview-card">
            <div className="game-cover">
                {game.image_url ? (
                    <img src={game.image_url} alt="" loading="lazy"/>
                ) : (
                    <span>{game.name.slice(0, 1)}</span>
                )}
            </div>

            <div>
                <div className="game-card-heading">
                    <a href={game.bgg_url} target="_blank" rel="noreferrer">
                        {game.name}
                    </a>
                    <span>
                        {rating && <strong>{rating}</strong>}
                        <button type="button" onClick={() => onRemoveGame(game.id)}>
                            Remove
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
