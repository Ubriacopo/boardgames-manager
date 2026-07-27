import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import type { Session, Subscription } from '@supabase/supabase-js';
import type { BoardGame } from '../entities/BoardGame';
import type { ContainerBox } from '../entities/ContainerBox';
import {
  getBggGameId,
  getBggMetadataByIds,
  searchBggMetadataByName,
  type BggGameMetadata,
} from '../utils/bggData';
import { supabase } from '../utils/supabase';

const DEFAULT_BOX_CAPACITY = 8;
const DEFAULT_BOX_COUNT = 16;

type AuthMode = 'sign-in' | 'sign-up';
type GridLayout = { rowCount: number; columnCount: number };
type Library = { id: string; user_id: string; name: string; created_at: string };
type BoxWithCapacity = ContainerBox & { capacity: number };
type KallaxBox = BoxWithCapacity & {
  games: BoardGame[];
  gameCount: number;
  usedCapacity: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDrag,
    CdkDropList,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatToolbarModule,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  session: Session | null = null;
  library: Library | null = null;
  boardGames: BoardGame[] = [];
  containerBoxes: BoxWithCapacity[] = [];
  metadataByGameId: Record<string, BggGameMetadata> = {};
  customGridLayout: GridLayout | null = null;
  draftGridLayout: GridLayout = { rowCount: 4, columnCount: 4 };
  selectedBoxId: number | null = null;
  selectedGameId: string | null = null;

  isAuthLoading = true;
  isLoading = true;
  isAddGameOpen = false;
  isSearchOpen = false;
  isGridLayoutOpen = false;
  isUnassignedOpen = true;
  errorMessage: string | null = null;

  authMode: AuthMode = 'sign-in';
  email = '';
  password = '';
  authStatusMessage: string | null = null;
  isSubmittingAuth = false;

  addQuery = '';
  addResults: BggGameMetadata[] = [];
  addError: string | null = null;
  isSearchingBgg = false;
  addingBggId: number | null = null;
  private addSearchTimer?: number;

  ownedSearchQuery = '';
  ownedSearchCategory = '';
  private authSubscription?: Subscription;
  private authInitializationTimer?: number;
  private loadGeneration = 0;

  constructor(
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.authInitializationTimer = window.setTimeout(() => {
      this.ngZone.run(() => {
        if (!this.isAuthLoading) return;
        this.isAuthLoading = false;
        this.errorMessage =
          'Session initialization timed out. Clear this site’s storage and reload, or sign in again.';
        this.cdr.detectChanges();
      });
    }, 5000);

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      this.ngZone.run(() => {
        const isInitialSession = event === 'INITIAL_SESSION';
        if (!isInitialSession && nextSession?.access_token === this.session?.access_token) return;

        if (this.authInitializationTimer) {
          window.clearTimeout(this.authInitializationTimer);
          this.authInitializationTimer = undefined;
        }

        this.applySession(nextSession);
        this.isAuthLoading = false;
        this.cdr.detectChanges();

        // Keep the auth callback synchronous; database calls are deferred until
        // Supabase releases its internal auth lock.
        window.setTimeout(() => void this.loadLibrary(), 0);
      });
    });
    this.authSubscription = data.subscription;
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    if (this.authInitializationTimer) window.clearTimeout(this.authInitializationTimer);
    if (this.addSearchTimer) window.clearTimeout(this.addSearchTimer);
  }

  get kallaxBoxes(): KallaxBox[] {
    return this.containerBoxes.map((box) => {
      const games = this.boardGames.filter((game) => game.box === box.id);
      return { ...box, games, gameCount: games.length, usedCapacity: this.usedCapacity(games) };
    });
  }

  get selectedBox(): BoxWithCapacity | null {
    return this.containerBoxes.find((box) => box.id === this.selectedBoxId) ?? null;
  }

  get selectedBoxGames(): BoardGame[] {
    return this.boardGames.filter((game) => game.box === this.selectedBoxId);
  }

  get unassignedGames(): BoardGame[] {
    return this.boardGames.filter((game) => game.box === null);
  }

  get assignedGameCount(): number {
    return this.boardGames.length - this.unassignedGames.length;
  }

  get averageRating(): number | null {
    const ratings = this.boardGames
      .map((game) => this.metadataByGameId[game.id]?.avgRating)
      .filter((rating): rating is number => typeof rating === 'number');
    return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
  }

  get autoGridLayout(): GridLayout {
    const count = Math.max(1, this.containerBoxes.length);
    const columnCount = Math.ceil(Math.sqrt(count));
    return { columnCount, rowCount: Math.ceil(count / columnCount) };
  }

  get gridLayout(): GridLayout {
    return this.customGridLayout ?? this.autoGridLayout;
  }

  get gridLayoutLabel(): string {
    const layout = this.gridLayout;
    return this.customGridLayout
      ? `${layout.columnCount}x${layout.rowCount}`
      : `Auto ${layout.columnCount}x${layout.rowCount}`;
  }

  get gridCapacityIsValid(): boolean {
    return this.draftGridLayout.rowCount * this.draftGridLayout.columnCount >= this.containerBoxes.length;
  }

  get ownedCategories(): string[] {
    return Array.from(
      new Set(
        this.boardGames.flatMap((game) => {
          const metadata = this.metadataByGameId[game.id];
          return [...(metadata?.themes ?? []), ...(metadata?.mechanics ?? [])];
        }),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  get ownedSearchResults(): BoardGame[] {
    const matcher = this.titleMatcher(this.ownedSearchQuery.trim());
    const category = this.ownedSearchCategory.toLowerCase();
    return this.boardGames.filter((game) => {
      const metadata = this.metadataByGameId[game.id];
      const categories = [...(metadata?.themes ?? []), ...(metadata?.mechanics ?? [])];
      return (!matcher || matcher.test(game.name)) &&
        (!category || categories.some((item) => item.toLowerCase() === category));
    });
  }

  async submitAuth(): Promise<void> {
    this.isSubmittingAuth = true;
    this.errorMessage = null;
    this.authStatusMessage = null;
    const credentials = { email: this.email.trim(), password: this.password };
    const { data, error } = this.authMode === 'sign-in'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);
    if (error) this.errorMessage = error.message;
    else if (this.authMode === 'sign-up' && !data.session) {
      this.authStatusMessage = 'Account created. Check your email to confirm it, then sign in.';
    }
    this.isSubmittingAuth = false;
  }

  toggleAuthMode(): void {
    this.authMode = this.authMode === 'sign-in' ? 'sign-up' : 'sign-in';
    this.errorMessage = null;
    this.authStatusMessage = null;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) this.errorMessage = error.message;
  }

  openGridDialog(): void {
    this.draftGridLayout = { ...this.gridLayout };
    this.isGridLayoutOpen = true;
  }

  applyGridLayout(): void {
    if (!this.gridCapacityIsValid) return;
    this.customGridLayout = { ...this.draftGridLayout };
    this.isGridLayoutOpen = false;
  }

  useAutoGrid(): void {
    this.customGridLayout = null;
    this.isGridLayoutOpen = false;
  }

  selectGame(gameId: string): void {
    const game = this.boardGames.find((candidate) => candidate.id === gameId);
    if (!game) {
      this.errorMessage = 'Selected game was not found.';
      return;
    }
    this.selectedGameId = gameId;
    if (game.box === null) this.isUnassignedOpen = true;
    else this.selectedBoxId = game.box;
  }

  selectOwnedSearchResult(gameId: string): void {
    this.selectGame(gameId);
    this.isSearchOpen = false;
  }

  dropGame(boxId: number, event: CdkDragDrop<unknown>): void {
    const gameId = event.item.data as string;
    if (gameId) void this.assignGameToBox(boxId, gameId);
  }

  async assignGameToBox(boxId: number, gameId: string): Promise<void> {
    const box = this.containerBoxes.find((candidate) => candidate.id === boxId);
    const game = this.boardGames.find((candidate) => candidate.id === gameId);
    if (!game) return;
    const used = this.usedCapacity(this.boardGames.filter((item) => item.box === boxId && item.id !== gameId));
    if (used + game.size > (box?.capacity ?? DEFAULT_BOX_CAPACITY)) {
      this.errorMessage = `${box?.description ?? `#${boxId}`} is at capacity.`;
      return;
    }
    await this.updateGameBox(gameId, boxId);
  }

  async removeGameFromBox(gameId: string): Promise<void> {
    await this.updateGameBox(gameId, null);
  }

  async sellGame(gameId: string): Promise<void> {
    const previous = this.boardGames;
    this.boardGames = previous.filter((game) => game.id !== gameId);
    const { error } = await supabase.from('board_games').delete().eq('id', gameId);
    if (error) {
      this.boardGames = previous;
      this.errorMessage = error.message;
    }
  }

  openAddDialog(): void {
    this.addQuery = '';
    this.addResults = [];
    this.addError = null;
    this.isAddGameOpen = true;
  }

  closeAddDialog(): void {
    this.isAddGameOpen = false;
    this.addQuery = '';
    this.addResults = [];
  }

  searchBggSoon(): void {
    if (this.addSearchTimer) window.clearTimeout(this.addSearchTimer);
    if (this.addQuery.trim().length < 2) {
      this.addResults = [];
      return;
    }
    this.addSearchTimer = window.setTimeout(() => void this.searchBgg(), 180);
  }

  isExistingGame(bggId: number): boolean {
    return this.boardGames.some((game) => game.bgg_id === bggId);
  }

  async addGame(game: BggGameMetadata): Promise<void> {
    if (!this.library) return;
    this.addingBggId = game.bggId;
    const { data, error } = await supabase
      .from('board_games')
      .insert({
        library_id: this.library.id,
        bgg_id: game.bggId,
        bgg_url: `https://boardgamegeek.com/boardgame/${game.bggId}`,
        name: game.name,
        release_year: game.yearPublished ?? new Date().getFullYear(),
        size: 1,
      })
      .select('*')
      .single();
    this.addingBggId = null;
    if (error) {
      this.addError = error.message;
      return;
    }
    this.boardGames = [...this.boardGames, data].sort((a, b) => a.name.localeCompare(b.name));
    this.selectedGameId = data.id;
    this.closeAddDialog();
    await this.loadMetadata();
  }

  boxLocation(game: BoardGame): string {
    const box = this.containerBoxes.find((candidate) => candidate.id === game.box);
    return box ? box.description ?? `#${box.id}` : 'Unassigned';
  }

  categoriesText(game: BoardGame): string {
    const metadata = this.metadataByGameId[game.id];
    return [...(metadata?.themes ?? []), ...(metadata?.mechanics ?? [])].slice(0, 4).join(' · ');
  }

  ratingClass(rating: number): string {
    if (rating < 5) return 'is-low';
    if (rating < 7) return 'is-mid';
    if (rating > 8) return 'is-top';
    return 'is-high';
  }

  shortenTitle(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word.slice(0, 8)).join(' ');
  }

  usedCapacity(games: BoardGame[]): number {
    return games.reduce((sum, game) => sum + game.size, 0);
  }

  trackById(_index: number, item: { id: string | number }): string | number {
    return item.id;
  }

  private applySession(session: Session | null): void {
    this.session = session;
    this.library = null;
    this.boardGames = [];
    this.containerBoxes = [];
    this.metadataByGameId = {};
    this.selectedBoxId = null;
    this.selectedGameId = null;
  }

  private async loadLibrary(): Promise<void> {
    const generation = ++this.loadGeneration;
    if (!this.session) {
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    try {
      const library = await this.ensureCurrentUserLibrary(this.session);
      const [gamesResult, boxesResult] = await Promise.all([
        supabase.from('board_games').select('*').eq('library_id', library.id).order('name'),
        supabase.from('container_box').select('*').eq('library_id', library.id).order('id'),
      ]);
      if (generation !== this.loadGeneration) return;
      if (gamesResult.error) throw gamesResult.error;
      if (boxesResult.error) throw boxesResult.error;
      this.library = library;
      this.boardGames = gamesResult.data;
      this.containerBoxes = (boxesResult.data as ContainerBox[]).map((box) => ({
        ...box,
        capacity: box.capacity ?? DEFAULT_BOX_CAPACITY,
      }));
      this.selectedBoxId = this.containerBoxes[0]?.id ?? null;
      await this.loadMetadata();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to load your library.';
    } finally {
      if (generation === this.loadGeneration) this.isLoading = false;
    }
  }

  private async loadMetadata(): Promise<void> {
    const gameIdsByBggId = new Map<number, string>();
    for (const game of this.boardGames) {
      const bggId = getBggGameId(game.bgg_url);
      if (bggId) gameIdsByBggId.set(bggId, game.id);
    }
    const byBggId = await getBggMetadataByIds([...gameIdsByBggId.keys()]);
    const result: Record<string, BggGameMetadata> = {};
    byBggId.forEach((metadata, bggId) => {
      const gameId = gameIdsByBggId.get(bggId);
      if (gameId) result[gameId] = metadata;
    });
    this.metadataByGameId = result;
  }

  private async updateGameBox(gameId: string, boxId: number | null): Promise<void> {
    const previous = this.boardGames;
    this.errorMessage = null;
    this.selectedGameId = gameId;
    this.selectedBoxId = boxId ?? this.selectedBoxId;
    this.boardGames = previous.map((game) => game.id === gameId ? { ...game, box: boxId } : game);
    const { data, error } = await supabase
      .from('board_games').update({ box: boxId }).eq('id', gameId).select('id, box').single();
    if (error) {
      this.boardGames = previous;
      this.errorMessage = error.message;
    } else {
      this.boardGames = this.boardGames.map((game) =>
        game.id === data.id ? { ...game, box: data.box } : game);
    }
  }

  private async searchBgg(): Promise<void> {
    this.isSearchingBgg = true;
    this.addError = null;
    try {
      this.addResults = await searchBggMetadataByName(this.addQuery);
    } catch (error) {
      this.addError = error instanceof Error ? error.message : 'Unable to search local game data.';
    } finally {
      this.isSearchingBgg = false;
    }
  }

  private async ensureCurrentUserLibrary(session: Session): Promise<Library> {
    const { error: userError } = await supabase.from('app_users')
      .upsert({ id: session.user.id, email: session.user.email ?? null }, { onConflict: 'id' });
    if (userError) throw userError;
    const { data: existing, error: selectError } = await supabase.from('libraries')
      .select('*').eq('user_id', session.user.id).maybeSingle();
    if (selectError) throw selectError;
    if (existing) {
      await this.ensureDefaultBoxes(existing.id);
      return existing;
    }
    const { data: created, error: insertError } = await supabase.from('libraries')
      .insert({ user_id: session.user.id, name: 'My library' }).select('*').single();
    if (insertError) throw insertError;
    await this.ensureDefaultBoxes(created.id);
    return created;
  }

  private async ensureDefaultBoxes(libraryId: string): Promise<void> {
    const boxes = Array.from({ length: DEFAULT_BOX_COUNT }, (_value, index) => ({
      library_id: libraryId,
      label: `Cube ${String(index + 1).padStart(2, '0')}`,
      description: `Cube ${String(index + 1).padStart(2, '0')}`,
      capacity: DEFAULT_BOX_CAPACITY,
    }));
    const { error } = await supabase.from('container_box')
      .upsert(boxes, { onConflict: 'library_id,label', ignoreDuplicates: true });
    if (error) throw error;
  }

  private titleMatcher(query: string): RegExp | null {
    if (!query) return null;
    try {
      return new RegExp(query, 'i');
    } catch {
      return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
  }
}
