import { Component, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { BoardGame } from '../../entities/BoardGame';
import { searchBggMetadataByName, type BggGameMetadata } from '../../utils/bggData';
import { LibraryService } from '../services/library.service';
import { GameCardComponent } from '../components/game-card.component';

@Component({
  standalone: true,
  imports: [DecimalPipe, FormsModule, CdkDrag, CdkDropList, CdkDropListGroup, RouterLink, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, GameCardComponent],
  templateUrl: './library.component.html',
})
export class LibraryComponent {
  activeTab: 'shelf' | 'recent' = 'shelf';
  selectedBox: number | null = null;
  gridColumns = 4;
  gridRows = 4;
  draftColumns = 4;
  draftRows = 4;
  layoutOpen = false;
  addQuery = '';
  addResults: BggGameMetadata[] = [];
  addError = '';
  searching = false;
  adding: number | null = null;
  private timer?: number;
  readonly assignedCount = computed(() => this.library.games().length - this.library.unassigned().length);

  constructor(readonly library: LibraryService) {
    const boxCount = Math.max(1, library.boxes().length);
    this.gridColumns = Math.ceil(Math.sqrt(boxCount));
    this.gridRows = Math.ceil(boxCount / this.gridColumns);
    this.draftColumns = this.gridColumns;
    this.draftRows = this.gridRows;
  }
  get gridLayoutValid(): boolean {
    return Number.isInteger(this.draftColumns) && Number.isInteger(this.draftRows) &&
      this.draftColumns > 0 && this.draftRows > 0 &&
      this.draftColumns <= 12 && this.draftRows <= 12 &&
      this.draftColumns * this.draftRows >= this.library.boxes().length;
  }
  get addOpen(): boolean {
    return this.library.addDialogOpen();
  }
  set addOpen(open: boolean) {
    this.library.addDialogOpen.set(open);
  }
  get selectedBoxInfo() {
    return this.library.boxes().find((box) => box.id === this.selectedBox) ?? null;
  }
  get selectedGames(): BoardGame[] {
    return this.selectedBox === null ? [] : this.gamesInBox(this.selectedBox);
  }
  applyGridLayout(): void {
    if (!this.gridLayoutValid) return;
    this.gridColumns = this.draftColumns;
    this.gridRows = this.draftRows;
    this.layoutOpen = false;
  }
  openLayoutSettings(): void {
    this.draftColumns = this.gridColumns;
    this.draftRows = this.gridRows;
    this.layoutOpen = true;
  }
  recentlyAdded(): BoardGame[] {
    return [...this.library.games()]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 8);
  }
  gamesInBox(id: number): BoardGame[] { return this.library.games().filter((game) => game.box === id); }
  capacity(id: number): number { return this.gamesInBox(id).reduce((sum, game) => sum + game.size, 0); }
  location(id: number | null): string { return this.library.boxes().find((box) => box.id === id)?.description ?? 'Unassigned'; }
  initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join(''); }
  openAdd(): void { this.addOpen = true; this.addQuery = ''; this.addResults = []; }
  exists(id: number): boolean { return this.library.games().some((game) => game.bgg_id === id); }
  drop(box: number, event: CdkDragDrop<BoardGame[]>): void { void this.move(event.item.data as string, box); }
  unassign(event: CdkDragDrop<BoardGame[]>): void { void this.move(event.item.data as string, null); }
  async move(gameId: string, box: number | null): Promise<void> {
    try { await this.library.moveGame(gameId, box); } catch (error) {
      this.library.error.set(error instanceof Error ? error.message : 'Unable to move this game.');
    }
  }
  searchSoon(): void {
    if (this.timer) window.clearTimeout(this.timer);
    if (this.addQuery.trim().length < 2) { this.addResults = []; return; }
    this.timer = window.setTimeout(() => void this.search(), 200);
  }
  async search(): Promise<void> {
    this.searching = true;
    try { this.addResults = await searchBggMetadataByName(this.addQuery, 16); }
    catch (error) { this.addError = error instanceof Error ? error.message : 'Search failed.'; }
    finally { this.searching = false; }
  }
  async add(game: BggGameMetadata): Promise<void> {
    this.adding = game.bggId;
    try {
      await this.library.addGame({ bgg_id: game.bggId, bgg_url: `https://boardgamegeek.com/boardgame/${game.bggId}`,
        name: game.name, release_year: game.yearPublished ?? new Date().getFullYear(), size: 1 });
      this.addOpen = false;
    } catch (error) { this.addError = error instanceof Error ? error.message : 'Unable to add this game.'; }
    finally { this.adding = null; }
  }
}
