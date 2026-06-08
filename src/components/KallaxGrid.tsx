import type { CSSProperties } from 'react';
import type { BoardGame } from '../entities/BoardGame';
import type { ContainerBox } from '../entities/ContainerBox';

type KallaxBox = ContainerBox & {
  capacity: number;
  games: BoardGame[];
  gameCount: number;
  usedCapacity: number;
};

type KallaxGridProps = {
  boxes: KallaxBox[];
  columnCount?: number;
  rowCount?: number;
  selectedBoxId: number | null;
  onSelectBox: (boxId: number) => void;
  onDropGame: (boxId: number, gameId: string) => void;
};

export function KallaxGrid({
  boxes,
  columnCount,
  rowCount,
  selectedBoxId,
  onSelectBox,
  onDropGame,
}: KallaxGridProps) {
  const fallbackGridLayout = getDefaultGridLayout(boxes.length);
  const gridColumnCount = columnCount ?? fallbackGridLayout.columnCount;
  const gridRowCount = rowCount ?? (columnCount ? Math.ceil(boxes.length / columnCount) : fallbackGridLayout.rowCount);

  return (
    <section
      className="kallax-grid"
      style={
        {
          '--kallax-column-count': gridColumnCount,
          '--kallax-row-count': gridRowCount,
        } as CSSProperties
      }
      aria-label="Kallax shelf"
    >
      {boxes.map((box) => {
        const isFull = box.usedCapacity >= box.capacity;

        return (
          <button
            key={box.id}
            type="button"
            className={`kallax-box${selectedBoxId === box.id ? ' is-selected' : ''}${
              isFull ? ' is-full' : ''
            }`}
            onClick={() => onSelectBox(box.id)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              const gameId = event.dataTransfer.getData('text/plain');

              if (gameId) {
                onDropGame(box.id, gameId);
              }
            }}
            aria-pressed={selectedBoxId === box.id}
          >
            <span className="box-number">
              {box.description ?? `#${box.id}`}
            </span>
            <GameStackPreview games={box.games} />
            <span className="box-count">
              {box.usedCapacity}/{box.capacity}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function GameStackPreview({ games }: { games: BoardGame[] }) {
  const visibleGames = games.slice(0, 7);
  const hiddenGameCount = games.length - visibleGames.length;

  if (games.length === 0) {
    return <span className="box-stack is-empty" aria-hidden="true" />;
  }

  return (
    <span className="box-stack" aria-label={`${games.length} games`}>
      {visibleGames.map((game) => (
        <span key={game.id} className="box-game-preview" title={game.name}>
          <span>{shortenTitle(game.name)}</span>
        </span>
      ))}

      {hiddenGameCount > 0 && (
        <span className="box-game-preview more-games">+{hiddenGameCount}</span>
      )}
    </span>
  );
}

function shortenTitle(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.slice(0, 8))
    .join(' ');
}

function getDefaultGridLayout(boxCount: number) {
  const safeBoxCount = Math.max(1, boxCount);
  const columnCount = Math.ceil(Math.sqrt(safeBoxCount));
  const rowCount = Math.ceil(safeBoxCount / columnCount);

  return { rowCount, columnCount };
}
