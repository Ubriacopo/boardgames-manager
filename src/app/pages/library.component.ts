import { DecimalPipe } from '@angular/common';
import { Component, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragEnd, CdkDragHandle, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { BoardGame } from '../../entities/BoardGame';
import { LibraryService } from '../services/library.service';

@Component({
  standalone: true,
  imports: [DecimalPipe, FormsModule, CdkDrag, CdkDragHandle, CdkDropList, CdkDropListGroup, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule, MatSnackBarModule],
  templateUrl: './library.component.html',
})
export class LibraryComponent {
  activeTab: 'shelf' | 'recent' = 'shelf';
  selectedBox: number | null = null;
  unassignedOpen = false;
  gridColumns = 4;
  gridRows = 4;
  kallaxZoom = 1;
  draftColumns = 4;
  draftRows = 4;
  layoutOpen = false;
  readonly assignedCount = computed(() => this.library.games().length - this.library.unassigned().length);

  constructor(
    readonly library: LibraryService,
    private readonly snackBar: MatSnackBar,
  ) {
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
  get selectedBoxInfo() {
    return this.library.boxes().find((box) => box.id === this.selectedBox) ?? null;
  }
  get selectedGames(): BoardGame[] {
    return this.selectedBox === null ? [] : this.gamesInBox(this.selectedBox);
  }
  @HostListener('document:click')
  closeSelectedBox(): void {
    this.selectedBox = null;
  }
  selectBox(boxId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedBox = boxId;
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
  zoomIn(): void {
    this.kallaxZoom = Math.min(1.5, Math.round((this.kallaxZoom + 0.1) * 10) / 10);
  }
  zoomOut(): void {
    this.kallaxZoom = Math.max(0.5, Math.round((this.kallaxZoom - 0.1) * 10) / 10);
  }
  async favorite(game: BoardGame): Promise<void> {
    try {
      await this.library.setFavorite(game.id, true);
      this.snackBar.open(`${game.name} added to favorites`, 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Unable to favorite this game.', 'Dismiss');
    }
  }
  async removeFromLibrary(game: BoardGame): Promise<void> {
    try {
      await this.library.removeGame(game.id);
      const notice = this.snackBar.open(`${game.name} removed from your library`, 'Undo', { duration: 5000 });
      notice.onAction().subscribe(() => void this.library.restoreGame(game));
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Unable to remove this game.', 'Dismiss');
    }
  }
  swipeGame(game: BoardGame, event: CdkDragEnd): void {
    const distance = event.distance.x;
    event.source.reset();
    if (distance <= -72) void this.favorite(game);
    if (distance >= 72) void this.removeFromLibrary(game);
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
  drop(box: number, event: CdkDragDrop<BoardGame[]>): void { void this.move(event.item.data as string, box); }
  unassign(event: CdkDragDrop<BoardGame[]>): void { void this.move(event.item.data as string, null); }
  async move(gameId: string, box: number | null): Promise<void> {
    try { await this.library.moveGame(gameId, box); } catch (error) {
      this.library.error.set(error instanceof Error ? error.message : 'Unable to move this game.');
    }
  }
}
