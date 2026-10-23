import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import type { BoardGame, BoxSizeSelection, GameDefinition } from '../../entities/BoardGame';
import { LibraryService } from '../services/library.service';
import { GameBoxSizeFormComponent } from './game-box-size-form.component';

@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, GameBoxSizeFormComponent],
  template: `
    <h2 mat-dialog-title>Add {{ game.name }}</h2>
    <mat-dialog-content>
      <p class="text-sm text-muted">New copies start unassigned. Place them in any Kallax from the Unassigned tray.</p>
      <p class="mb-5 text-sm text-muted">Choose the edition you own, or enter your box dimensions.</p>
      <app-game-box-size-form [gameId]="game.id" [saving]="saving()" [error]="error()"
          submitLabel="Add to my collection" (selectionSave)="add($event)" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="saving()" (click)="dialog.close()">Cancel</button>
    </mat-dialog-actions>
  `,
})
export class AddGameDialogComponent {
  readonly saving = signal(false);
  readonly error = signal('');
  constructor(@Inject(MAT_DIALOG_DATA) readonly game: Pick<GameDefinition, 'id' | 'name'>,
    readonly dialog: MatDialogRef<AddGameDialogComponent, BoardGame>, readonly library: LibraryService) {}

  async add(selection: BoxSizeSelection): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true); this.error.set(''); this.dialog.disableClose = true;
    try {
      const copy = await this.library.addGame({ gameId: this.game.id, selection });
      this.dialog.close(copy);
    } catch (error) {
      this.error.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to add this copy.');
      this.saving.set(false); this.dialog.disableClose = false;
    }
  }
}
