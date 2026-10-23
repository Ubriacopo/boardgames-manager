import { GameSpineComponent } from '../components/game-spine.component';
import {GameCoverService} from '../services/game-cover.service';
import {makeSearchScorer} from '../../utils/search';
import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BoardGame } from '../../entities/BoardGame';
import { ContainerBox } from '../../entities/ContainerBox';
import type { Library } from '../services/library.service';
import { FriendCollection, FriendsService, SocialProfile } from '../services/friends.service';

@Component({
  standalone: true,
  imports: [GameSpineComponent, FormsModule, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './friend-collection.component.html',
})
export class FriendCollectionComponent implements OnInit {
  libraries: Library[] = [];
  selectedLibraryId = '';
  profile: SocialProfile | null = null;
  collection: FriendCollection = { games: [], boxes: [], placements: [], columns: null, rows: null };
  view: 'shelf' | 'list' = 'shelf';
  selectedBox: number | null = null;
  query = '';
  readonly loading = signal(true);
  readonly error = signal('');
  private version = 0;

  constructor(private readonly friends: FriendsService, private readonly route: ActivatedRoute, private readonly destroyRef: DestroyRef, private readonly covers: GameCoverService) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      void this.load(params.get('userId') ?? '');
    });
  }

  async load(userId = this.route.snapshot.paramMap.get('userId') ?? ''): Promise<void> {
    const version = ++this.version;
    this.loading.set(true); this.error.set(''); this.profile = null; this.selectedBox = null; this.query = '';
    this.collection = { games: [], boxes: [], placements: [], columns: null, rows: null };
    this.libraries = [];
    this.selectedLibraryId = '';
    try {
      if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Collector not found.');
      const [profile, libraries] = await Promise.all([this.friends.profile(userId), this.friends.libraries(userId)]);
      const collection = await this.friends.collection(userId, libraries[0]?.id);
      if (version === this.version) {
        this.profile = profile; this.collection = collection; this.libraries = libraries;
        this.selectedLibraryId = libraries[0]?.id ?? '';
      }
    } catch (error) {
      if (version === this.version) this.error.set(error && typeof error === 'object' && 'message' in error
        ? String(error.message) : 'Unable to load this collection.');
    } finally { if (version === this.version) this.loading.set(false); }
  }

  async selectLibrary(id: string): Promise<void> {
    const version = ++this.version;
    this.loading.set(true); this.error.set('');
    try {
      const collection = await this.friends.collection(this.profile!.id, id);
      if (version === this.version) {
        this.collection = collection; this.selectedLibraryId = id; this.selectedBox = null;
      }
    } catch (error) {
      if (version === this.version) this.error.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to load this library.');
    } finally { if (version === this.version) this.loading.set(false); }
  }

  private get savedLayoutFits(): boolean {
    return !!(this.collection.columns && this.collection.rows
      && this.collection.columns * this.collection.rows >= this.collection.boxes.length);
  }
  get columns(): number {
    return this.savedLayoutFits ? this.collection.columns! : Math.ceil(Math.sqrt(Math.max(1, this.collection.boxes.length)));
  }
  get rows(): number {
    return this.savedLayoutFits ? this.collection.rows! : Math.ceil(Math.max(1, this.collection.boxes.length) / this.columns);
  }
  get selectedCube(): ContainerBox | undefined { return this.collection.boxes.find(box => box.id === this.selectedBox); }
  get unassigned(): BoardGame[] { return this.collection.games.filter(game => this.boxFor(game) === null); }
  get filtered(): BoardGame[] {
    const query = this.query.trim().toLowerCase();
    const score = makeSearchScorer(query);
    return this.collection.games.filter(game => score(`${game.name} ${game.release_year}`) > 0);
  }

  private boxFor(game: BoardGame): number | null {
    const placement = this.collection.placements.find(p => p.game_id === game.id);
    return placement ? placement.container_box_id : game.box;
  }

  gamesInBox(boxId: number): BoardGame[] {
    return this.collection.games.filter(game => this.boxFor(game) === boxId).sort((a, b) =>
      (this.collection.placements.find(p => p.game_id === a.id)?.sort_order ?? 0)
      - (this.collection.placements.find(p => p.game_id === b.id)?.sort_order ?? 0) || a.name.localeCompare(b.name));
  }

  location(game: BoardGame): string {
    const box = this.collection.boxes.find(b => b.id === this.boxFor(game));
    return box?.description ?? box?.label ?? 'Unassigned';
  }

  sideImage(game: BoardGame): string | null { return this.covers.sideForGame(game); }

  width(game: BoardGame, box: ContainerBox): number {
    const width = box.layout_direction === 'vertical' ? game.box_depth_mm : game.box_width_mm;
    return Math.min(100, width / box.inner_width_mm * 100);
  }
  height(game: BoardGame, box: ContainerBox): number {
    return Math.min(100, (box.layout_direction === 'vertical' ? game.box_height_mm : game.box_depth_mm) / box.inner_height_mm * 100);
  }
  initials(name: string): string { return name.split(/\s+/).map(word => word[0]).slice(0, 4).join(''); }
}
