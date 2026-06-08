import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import './App.css';
import { AddGameDialog } from './components/AddGameDialog';
import { GamePreviewList } from './components/GamePreviewList';
import { GameSearchDialog } from './components/GameSearchDialog';
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
const DEFAULT_BOX_COUNT = 16;

type AuthMode = 'sign-in' | 'sign-up';
type GridLayout = {
  rowCount: number;
  columnCount: number;
};

type Library = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

type KallaxBox = ContainerBox & {
  capacity: number;
  games: BoardGame[];
  gameCount: number;
  usedCapacity: number;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [boardGames, setBoardGames] = useState<BoardGame[]>([]);
  const [containerBoxes, setContainerBoxes] = useState<Array<ContainerBox & { capacity: number }>>([]);
  const [bggMetadataByGameId, setBggMetadataByGameId] = useState<Record<string, BggGameMetadata>>({});
  const [customGridLayout, setCustomGridLayout] = useState<GridLayout | null>(null);
  const [draftGridLayout, setDraftGridLayout] = useState<GridLayout>({
    rowCount: 4,
    columnCount: 4,
  });
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGridLayoutOpen, setIsGridLayoutOpen] = useState(false);
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function getInitialSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
      }

      setSession(data.session);
      setIsAuthLoading(false);
    }

    void getInitialSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLibrary(null);
      setBoardGames([]);
      setContainerBoxes([]);
      setSelectedBoxId(null);
      setSelectedGameId(null);
      setErrorMessage(null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function getInitialData() {
      if (!session) {
        setLibrary(null);
        setBoardGames([]);
        setContainerBoxes([]);
        setBggMetadataByGameId({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextLibrary = await ensureCurrentUserLibrary(session);

        if (isCancelled) {
          return;
        }

        setLibrary(nextLibrary);

        const [boardGamesResult, containerBoxesResult] = await Promise.all([
          supabase
            .from('board_games')
            .select('*')
            .eq('library_id', nextLibrary.id)
            .order('name', { ascending: true }),
          supabase
            .from('container_box')
            .select('*')
            .eq('library_id', nextLibrary.id)
            .order('id', { ascending: true }),
        ]);

        if (boardGamesResult.error) {
          throw new Error(boardGamesResult.error.message);
        }

        if (containerBoxesResult.error) {
          throw new Error(containerBoxesResult.error.message);
        }

        const nextContainerBoxes = (containerBoxesResult.data as ContainerBox[]).map((box) => ({
          ...box,
          capacity: box.capacity ?? DEFAULT_BOX_CAPACITY,
        }));

        setBoardGames(boardGamesResult.data);
        setContainerBoxes(nextContainerBoxes);
        setSelectedBoxId((currentBoxId) => currentBoxId ?? nextContainerBoxes[0]?.id ?? null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load your library.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void getInitialData();

    return () => {
      isCancelled = true;
    };
  }, [session]);

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

  if (isAuthLoading) {
    return (
      <main className="app-page auth-page">
        <p>Checking session...</p>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen errorMessage={errorMessage} onError={setErrorMessage} />;
  }

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
  const autoGridLayout = getDefaultGridLayout(containerBoxes.length);
  const gridLayout = customGridLayout ?? autoGridLayout;
  const gridLayoutLabel = customGridLayout
    ? `${customGridLayout.columnCount}x${customGridLayout.rowCount}`
    : `Auto ${autoGridLayout.columnCount}x${autoGridLayout.rowCount}`;
  const assignedGameCount = boardGames.length - unassignedGames.length;
  const averageRating = getAverageRating(boardGames, bggMetadataByGameId);

  function selectGame(gameId: string) {
    const game = boardGames.find((candidateGame) => candidateGame.id === gameId);

    if (!game) {
      setErrorMessage('Selected game was not found.');
      return;
    }

    setErrorMessage(null);
    setSelectedGameId(gameId);

    if (game.box === null) {
      setIsUnassignedOpen(true);
    } else {
      setSelectedBoxId(game.box);
    }
  }

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
    if (!library) {
      throw new Error('Library is still loading.');
    }

    setErrorMessage(null);

    const { data, error } = await supabase
      .from('board_games')
      .insert({
        library_id: library.id,
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

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <main className="app-page">
      <header className="app-header">
        <div>
          <p className="eyebrow">Boardgames Manager</p>
          <h1>{library?.name ?? 'Kallax shelf'}</h1>
          <p className="muted">Signed in as {session.user.email}</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsSearchOpen(true)}
            disabled={isLoading}
          >
            Search
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setDraftGridLayout(customGridLayout ?? autoGridLayout);
              setIsGridLayoutOpen(true);
            }}
            disabled={isLoading}
          >
            Grid: {gridLayoutLabel}
          </button>

          <button
            type="button"
            className="add-game-button"
            onClick={() => setIsAddGameOpen(true)}
            disabled={isLoading || !library}
          >
            Add game
          </button>

          <button type="button" className="secondary-button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="library-summary" aria-label="Library summary">
        <span>
          <strong>{boardGames.length}</strong>
          games owned
        </span>
        <span>
          <strong>{assignedGameCount}</strong>
          in Kallax
        </span>
        <span>
          <strong>{unassignedGames.length}</strong>
          unassigned
        </span>
        {averageRating !== null && (
          <span>
            <strong>{averageRating.toFixed(1)}</strong>
            avg rating
          </span>
        )}
      </section>

      {isLoading && <p>Loading your library...</p>}

      {errorMessage && <p className="error">Supabase error: {errorMessage}</p>}

      {!isLoading && (
        <div className="shelf-layout">
          <UnassignedGamesList
            games={unassignedGames}
            isOpen={isUnassignedOpen}
            selectedGameId={selectedGameId}
            bggMetadataByGameId={bggMetadataByGameId}
            onToggleOpen={() => setIsUnassignedOpen((isOpen) => !isOpen)}
            onSelectGame={selectGame}
            onSellGame={(gameId) => void sellGame(gameId)}
          />

          <div className="kallax-area">
            <KallaxGrid
              boxes={kallaxBoxes}
              columnCount={gridLayout.columnCount}
              rowCount={gridLayout.rowCount}
              selectedBoxId={selectedBoxId}
              onSelectBox={setSelectedBoxId}
              onDropGame={(boxId, gameId) => void assignGameToBox(boxId, gameId)}
            />

            <GamePreviewList
              selectedBox={selectedBox}
              games={selectedBoxGames}
              usedCapacity={selectedBoxUsedCapacity}
              selectedGameId={selectedGameId}
              bggMetadataByGameId={bggMetadataByGameId}
              onSelectGame={selectGame}
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

      <GridLayoutDialog
        isOpen={isGridLayoutOpen}
        boxCount={containerBoxes.length}
        draftLayout={draftGridLayout}
        autoLayout={autoGridLayout}
        onDraftChange={setDraftGridLayout}
        onClose={() => setIsGridLayoutOpen(false)}
        onApply={(nextLayout) => {
          setCustomGridLayout(nextLayout);
          setIsGridLayoutOpen(false);
        }}
        onUseAuto={() => {
          setCustomGridLayout(null);
          setDraftGridLayout(autoGridLayout);
          setIsGridLayoutOpen(false);
        }}
      />

      <GameSearchDialog
        isOpen={isSearchOpen}
        games={boardGames}
        boxes={containerBoxes}
        bggMetadataByGameId={bggMetadataByGameId}
        onClose={() => setIsSearchOpen(false)}
        onSelectGame={selectGame}
      />
    </main>
  );
}

function GridLayoutDialog({
  isOpen,
  boxCount,
  draftLayout,
  autoLayout,
  onDraftChange,
  onClose,
  onApply,
  onUseAuto,
}: {
  isOpen: boolean;
  boxCount: number;
  draftLayout: GridLayout;
  autoLayout: GridLayout;
  onDraftChange: (layout: GridLayout) => void;
  onClose: () => void;
  onApply: (layout: GridLayout) => void;
  onUseAuto: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  const capacity = draftLayout.rowCount * draftLayout.columnCount;
  const canApply = capacity >= boxCount;

  function submitLayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (canApply) {
      onApply(draftLayout);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="grid-layout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grid-layout-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">Shelf layout</p>
            <h2 id="grid-layout-title">Customize grid shape</h2>
            <p className="muted">
              Auto uses {autoLayout.columnCount} columns x {autoLayout.rowCount} rows for {boxCount} cubes.
            </p>
          </div>
          <button type="button" className="dialog-close-button" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="grid-layout-form" onSubmit={submitLayout}>
          <label className="game-search-field">
            Rows
            <input
              type="number"
              min={1}
              value={draftLayout.rowCount}
              onChange={(event) =>
                onDraftChange({
                  ...draftLayout,
                  rowCount: getPositiveInteger(event.target.value),
                })
              }
              required
            />
          </label>

          <label className="game-search-field">
            Columns
            <input
              type="number"
              min={1}
              value={draftLayout.columnCount}
              onChange={(event) =>
                onDraftChange({
                  ...draftLayout,
                  columnCount: getPositiveInteger(event.target.value),
                })
              }
              required
            />
          </label>

          <p className={canApply ? 'muted' : 'error'}>
            {draftLayout.columnCount}x{draftLayout.rowCount} holds {capacity} cubes.
            {!canApply && ` You need at least ${boxCount}.`}
          </p>

          <div className="grid-layout-actions">
            <button type="submit" className="add-game-button" disabled={!canApply}>
              Apply layout
            </button>
            <button type="button" className="secondary-button" onClick={onUseAuto}>
              Use auto
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AuthScreen({
  errorMessage,
  onError,
}: {
  errorMessage: string | null;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    onError(null);

    const credentials = {
      email: email.trim(),
      password,
    };

    const { data, error } = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);

    if (error) {
      onError(error.message);
    } else if (mode === 'sign-up' && !data.session) {
      setStatusMessage('Account created. Check your email to confirm it, then sign in.');
    }

    setIsSubmitting(false);
  }

  return (
    <main className="app-page auth-page">
      <section className="auth-card">
        <p className="eyebrow">Boardgames Manager</p>
        <h1>Your shelf, your library</h1>
        <p className="muted">Sign in to load the board game library linked to your account.</p>

        <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
          <label className="game-search-field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="game-search-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>

          {errorMessage && <p className="error">{errorMessage}</p>}
          {statusMessage && <p className="muted">{statusMessage}</p>}

          <button type="submit" className="add-game-button" disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="secondary-button auth-mode-button"
          onClick={() => {
            setMode((currentMode) => (currentMode === 'sign-in' ? 'sign-up' : 'sign-in'));
            setStatusMessage(null);
            onError(null);
          }}
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}

async function ensureCurrentUserLibrary(session: Session): Promise<Library> {
  const userId = session.user.id;
  const email = session.user.email ?? null;

  const { error: userError } = await supabase
    .from('app_users')
    .upsert({ id: userId, email }, { onConflict: 'id' });

  if (userError) {
    throw new Error(userError.message);
  }

  const { data: existingLibrary, error: librarySelectError } = await supabase
    .from('libraries')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (librarySelectError) {
    throw new Error(librarySelectError.message);
  }

  if (existingLibrary) {
    await ensureDefaultBoxes(existingLibrary.id);
    return existingLibrary;
  }

  const { data: newLibrary, error: libraryInsertError } = await supabase
    .from('libraries')
    .insert({ user_id: userId, name: 'My library' })
    .select('*')
    .single();

  if (libraryInsertError) {
    throw new Error(libraryInsertError.message);
  }

  await ensureDefaultBoxes(newLibrary.id);

  return newLibrary;
}

async function ensureDefaultBoxes(libraryId: string) {
  const boxes = Array.from({ length: DEFAULT_BOX_COUNT }, (_value, index) => ({
    library_id: libraryId,
    label: `Cube ${String(index + 1).padStart(2, '0')}`,
    description: `Cube ${String(index + 1).padStart(2, '0')}`,
    capacity: DEFAULT_BOX_CAPACITY,
  }));

  const { error } = await supabase
    .from('container_box')
    .upsert(boxes, { onConflict: 'library_id,label', ignoreDuplicates: true });

  if (error) {
    throw new Error(error.message);
  }
}

function getUsedCapacity(games: BoardGame[]) {
  return games.reduce((total, game) => total + game.size, 0);
}

function getAverageRating(
  games: BoardGame[],
  bggMetadataByGameId: Record<string, BggGameMetadata>,
) {
  const ratings = games
    .map((game) => bggMetadataByGameId[game.id]?.avgRating)
    .filter((rating): rating is number => typeof rating === 'number');

  if (ratings.length === 0) {
    return null;
  }

  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
}

function getDefaultGridLayout(boxCount: number): GridLayout {
  const safeBoxCount = Math.max(1, boxCount);
  const columnCount = Math.ceil(Math.sqrt(safeBoxCount));
  const rowCount = Math.ceil(safeBoxCount / columnCount);

  return { rowCount, columnCount };
}

function getPositiveInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    return 1;
  }

  return Math.max(1, parsedValue);
}
