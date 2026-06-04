import { useEffect, useState } from 'react';
import './App.css';
import { AddGameDialog } from './components/AddGameDialog';
import { GamePreviewList } from './components/GamePreviewList';
import { KallaxGrid } from './components/KallaxGrid';
import { UnassignedGamesList } from './components/UnassignedGamesList';
import type { BoardGame } from './entities/BoardGame';
import type { ContainerBox } from './entities/ContainerBox';
import {
  getBggGameId,
  getBggMetadataByIds,
  type BggGameMetadata,
} from './utils/bggData';
import { supabase } from './utils/supabase';

const DEFAULT_BOX_CAPACITY = 8;
type GridShape = 'square' | 'four-by-two' | 'two-by-four';

type KallaxBox = ContainerBox & {
  capacity: number;
  games: BoardGame[];
  gameCount: number;
  usedCapacity: number;
};

export default function App() {
  const [boardGames, setBoardGames] = useState<BoardGame[]>([]);
  const [containerBoxes, setContainerBoxes] = useState<Array<ContainerBox & { capacity: number }>>([]);
  const [bggMetadataByGameId, setBggMetadataByGameId] = useState<Record<string, BggGameMetadata>>({});
  const [gridShape, setGridShape] = useState<GridShape>('square');
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    async function getInitialData() {
      const [boardGamesResult, containerBoxesResult] = await Promise.all([
        supabase
          .from('board_games')
          .select('*')
          .order('name', { ascending: true }),
        supabase.from('container_box').select('*').order('id', { ascending: true }),
      ]);

      if (boardGamesResult.error) {
        setErrorMessage(boardGamesResult.error.message);
      } else if (containerBoxesResult.error) {
        setErrorMessage(containerBoxesResult.error.message);
      } else {
        setBoardGames(boardGamesResult.data);
        const nextContainerBoxes = (containerBoxesResult.data as ContainerBox[]).map((box) => ({
            ...box,
            capacity: box.capacity ?? DEFAULT_BOX_CAPACITY,
        }));

        setContainerBoxes(nextContainerBoxes);
        setSelectedBoxId((currentBoxId) => currentBoxId ?? nextContainerBoxes[0]?.id ?? null);
      }

      setIsLoading(false);
    }

    void getInitialData();
  }, []);

  useEffect(() => {
    async function getBggMetadata() {
      if (boardGames.length === 0) {
        setBggMetadataByGameId({});
        return;
      }

      const gameIdsByBggId = new Map<number, string>();

      boardGames.forEach((game) => {
        const bggId = getBggGameId(game.bgg_url);

        if (bggId) {
          gameIdsByBggId.set(bggId, game.id);
        }
      });

      try {
        const metadataByBggId = await getBggMetadataByIds(Array.from(gameIdsByBggId.keys()));
        const nextMetadataByGameId: Record<string, BggGameMetadata> = {};

        metadataByBggId.forEach((metadata, bggId) => {
          const gameId = gameIdsByBggId.get(bggId);

          if (gameId) {
            nextMetadataByGameId[gameId] = metadata;
          }
        });

        setBggMetadataByGameId(nextMetadataByGameId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load local BGG data.');
      }
    }

    void getBggMetadata();
  }, [boardGames]);

  const kallaxBoxes: KallaxBox[] = containerBoxes.map((box) => {
    const gamesInBox = boardGames.filter((game) => game.box === box.id);

    return {
      ...box,
      games: gamesInBox,
      gameCount: gamesInBox.length,
      usedCapacity: getUsedCapacity(gamesInBox),
    };
  });
  const selectedBox = containerBoxes.find((box) => box.id === selectedBoxId) ?? null;
  const selectedBoxGames = selectedBoxId
    ? boardGames.filter((game) => game.box === selectedBoxId)
    : [];
  const selectedBoxUsedCapacity = getUsedCapacity(selectedBoxGames);
  const unassignedGames = boardGames.filter((game) => game.box === null);
  const existingBggIds = boardGames.map((game) => game.bgg_id);
  const gridShapeConfig = getGridShapeConfig(gridShape);

  async function assignGameToBox(boxId: number, gameId: string) {
    const containerBox = containerBoxes.find((box) => box.id === boxId);
    const nextBoxCapacity = containerBox?.capacity ?? DEFAULT_BOX_CAPACITY;
    const draggedGame = boardGames.find((game) => game.id === gameId);
    const isAlreadyInBox = boardGames.some(
      (game) => game.id === gameId && game.box === boxId,
    );
    const previousBoardGames = boardGames;
    const nextBoxUsedCapacity = getUsedCapacity(
      boardGames.filter((game) => game.box === boxId && game.id !== gameId),
    );
    const nextUsedCapacity = nextBoxUsedCapacity + (draggedGame?.size ?? 1);

    if (!draggedGame) {
      setErrorMessage('Selected game was not found.');
      return;
    }

    if (!isAlreadyInBox && nextUsedCapacity > nextBoxCapacity) {
      const boxLabel = containerBox?.description ?? `#${boxId}`;

      setErrorMessage(`${boxLabel} is at capacity.`);
      setSelectedBoxId(boxId);
      setSelectedGameId(gameId);
      return;
    }

    setErrorMessage(null);
    setSelectedBoxId(boxId);
    setSelectedGameId(gameId);
    setBoardGames((currentBoardGames) =>
      currentBoardGames.map((game) =>
        game.id === gameId ? { ...game, box: boxId } : game,
      ),
    );

    const { data, error } = await supabase
      .from('board_games')
      .update({ box: boxId })
      .eq('id', gameId)
      .select('id, box')
      .single();

    if (error) {
      setBoardGames(previousBoardGames);
      setErrorMessage(error.message);
    } else {
      setBoardGames((currentBoardGames) =>
        currentBoardGames.map((game) =>
          game.id === data.id ? { ...game, box: data.box } : game,
        ),
      );
    }
  }

  async function removeGameFromBox(gameId: string) {
    const previousBoardGames = boardGames;

    setErrorMessage(null);
    setSelectedGameId(gameId);
    setBoardGames((currentBoardGames) =>
      currentBoardGames.map((game) =>
        game.id === gameId ? { ...game, box: null } : game,
      ),
    );

    const { data, error } = await supabase
      .from('board_games')
      .update({ box: null })
      .eq('id', gameId)
      .select('id, box')
      .single();

    if (error) {
      setBoardGames(previousBoardGames);
      setErrorMessage(error.message);
    } else {
      setBoardGames((currentBoardGames) =>
        currentBoardGames.map((game) =>
          game.id === data.id ? { ...game, box: data.box } : game,
        ),
      );
    }
  }

  async function sellGame(gameId: string) {
    const previousBoardGames = boardGames;
    const gameToSell = boardGames.find((game) => game.id === gameId);

    if (!gameToSell) {
      setErrorMessage('Selected game was not found.');
      return;
    }

    setErrorMessage(null);
    setBoardGames((currentBoardGames) =>
      currentBoardGames.filter((game) => game.id !== gameId),
    );
    setSelectedGameId((currentGameId) => (currentGameId === gameId ? null : currentGameId));

    const { error } = await supabase.from('board_games').delete().eq('id', gameId);

    if (error) {
      setBoardGames(previousBoardGames);
      setSelectedGameId(gameId);
      setErrorMessage(error.message);
    }
  }

  async function addGame(game: BggGameMetadata) {
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('board_games')
      .insert({
        bgg_id: game.bggId,
        bgg_url: `https://boardgamegeek.com/boardgame/${game.bggId}`,
        name: game.name,
        release_year: game.yearPublished ?? new Date().getFullYear(),
        size: 1,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    setBoardGames((currentBoardGames) =>
      [...currentBoardGames, data].sort((firstGame, secondGame) =>
        firstGame.name.localeCompare(secondGame.name),
      ),
    );
    setSelectedGameId(data.id);
    setIsUnassignedOpen(true);
  }

  return (
    <main className="app-page">
      <header className="app-header">
        <div>
          <p className="eyebrow">Boardgames Manager</p>
          <h1>Kallax shelf</h1>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setGridShape(getNextGridShape)}
          >
            Grid: {gridShapeConfig.label}
          </button>

          <button type="button" className="add-game-button" onClick={() => setIsAddGameOpen(true)}>
            Add game
          </button>
        </div>
      </header>

      {isLoading && <p>Loading board games...</p>}

      {errorMessage && <p className="error">Supabase error: {errorMessage}</p>}

      {!isLoading && (
        <div className="shelf-layout">
          <UnassignedGamesList
            games={unassignedGames}
            isOpen={isUnassignedOpen}
            selectedGameId={selectedGameId}
            bggMetadataByGameId={bggMetadataByGameId}
            onToggleOpen={() => setIsUnassignedOpen((isOpen) => !isOpen)}
            onSelectGame={setSelectedGameId}
            onSellGame={(gameId) => void sellGame(gameId)}
          />

          <div className="kallax-area">
            <KallaxGrid
              boxes={kallaxBoxes}
              columnCount={gridShapeConfig.columnCount}
              rowCount={gridShapeConfig.rowCount}
              selectedBoxId={selectedBoxId}
              onSelectBox={setSelectedBoxId}
              onDropGame={(boxId, gameId) => void assignGameToBox(boxId, gameId)}
            />

            <GamePreviewList
              selectedBox={selectedBox}
              games={selectedBoxGames}
              usedCapacity={selectedBoxUsedCapacity}
              bggMetadataByGameId={bggMetadataByGameId}
              onRemoveGame={(gameId) => void removeGameFromBox(gameId)}
              onSellGame={(gameId) => void sellGame(gameId)}
            />
          </div>
        </div>
      )}

      <AddGameDialog
        isOpen={isAddGameOpen}
        existingBggIds={existingBggIds}
        onClose={() => setIsAddGameOpen(false)}
        onAddGame={addGame}
      />
    </main>
  );
}

function getUsedCapacity(games: BoardGame[]) {
  return games.reduce((total, game) => total + game.size, 0);
}

function getNextGridShape(currentShape: GridShape): GridShape {
  if (currentShape === 'square') {
    return 'four-by-two';
  }

  if (currentShape === 'four-by-two') {
    return 'two-by-four';
  }

  return 'square';
}

function getGridShapeConfig(shape: GridShape) {
  if (shape === 'four-by-two') {
    return { label: '4x2', columnCount: 4, rowCount: 2 };
  }

  if (shape === 'two-by-four') {
    return { label: '2x4', columnCount: 2, rowCount: 4 };
  }

  return { label: 'Square', columnCount: undefined, rowCount: undefined };
}
