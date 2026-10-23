import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule, type NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { GameBoxSize, GameDefinition } from '../../entities/BoardGame';
import { AuthService } from '../services/auth.service';
import { GameCatalogService } from '../services/game-catalog.service';
import { GameCoverService, type ArtworkKind } from '../services/game-cover.service';
import { CoverEditorComponent } from './cover-editor.component';

export type GameAdminEditorData = {
  gameId: string;
  bggId: number;
  name: string;
  releaseYear: number | null;
  imageUrl: string | null;
  bggUrl: string;
};

@Component({
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './game-admin-editor.component.html',
})
export class GameAdminEditorComponent implements OnInit {
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly artwork = [
    {kind: 'cover', label: 'Cover', icon: 'photo_library'},
    {kind: 'wallpaper', label: 'Wallpaper', icon: 'wallpaper'},
    {kind: 'logo', label: 'Logo', icon: 'image'},
    {kind: 'box-side', label: 'Box side', icon: 'view_week'},
  ] as const;
  name = '';
  releaseYear: number | null = null;
  fallbackImageUrl = '';
  defaultSizeId: string | null = null;
  sizes: GameBoxSize[] = [];
  private definition: GameDefinition | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: GameAdminEditorData,
    readonly dialogRef: MatDialogRef<GameAdminEditorComponent, GameDefinition>,
    private readonly auth: AuthService,
    private readonly catalog: GameCatalogService,
    private readonly covers: GameCoverService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.ready.set(false);
    this.error.set('');
    try {
      if (!this.auth.isAdmin()) throw new Error('Only administrators can edit games.');
      const definition = await this.catalog.findDefinition(this.data.gameId, this.data.bggId);
      const sizes = definition ? await this.catalog.sizes(definition.id) : [];
      this.definition = definition;
      this.sizes = sizes;
      this.name = definition?.name ?? this.data.name;
      this.releaseYear = definition?.release_year ?? this.data.releaseYear;
      this.fallbackImageUrl = (definition ? definition.image_url : this.data.imageUrl) ?? '';
      this.defaultSizeId = definition?.default_box_size_id ?? null;
      this.ready.set(true);
    } catch (error) {
      this.error.set(this.message(error, 'Unable to load game details.'));
    } finally { this.loading.set(false); }
  }

  artworkUrl(kind: ArtworkKind): string | null {
    const id = this.data.bggId;
    return ({cover: this.covers.urls(), wallpaper: this.covers.wallpapers(),
      logo: this.covers.logos(), 'box-side': this.covers.boxSides()}[kind])[id]
      ?? (kind === 'cover' ? (this.definition ? this.definition.image_url : this.data.imageUrl) : null);
  }

  editArtwork(kind: ArtworkKind): void {
    if (!this.auth.isAdmin() || !this.data.bggId || this.saving()) return;
    const imageUrl = this.artworkUrl(kind)
      ?? (kind === 'box-side' ? this.artworkUrl('wallpaper') : null)
      ?? this.artworkUrl('cover');
    this.dialog.open(CoverEditorComponent, {
      width: '760px', maxWidth: '95vw', panelClass: 'cover-editor-dialog',
      data: {bggId: this.data.bggId, name: this.name, kind, imageUrl},
    });
  }

  async save(form: NgForm): Promise<void> {
    if (this.saving() || !this.ready()) return;
    form.control.markAllAsTouched();
    if (form.invalid || this.releaseYear === null) return;
    this.saving.set(true);
    this.error.set('');
    this.dialogRef.disableClose = true;
    try {
      const game = await this.catalog.saveDefinition({
        id: this.definition?.id,
        bgg_id: this.definition?.bgg_id ?? (this.data.bggId || null),
        bgg_url: this.definition?.bgg_url ?? this.data.bggUrl,
      }, {
        name: this.name, release_year: this.releaseYear,
        image_url: this.fallbackImageUrl, default_box_size_id: this.defaultSizeId,
      });
      this.dialogRef.close(game);
    } catch (error) {
      this.error.set(this.message(error, 'Unable to save game details.'));
    } finally {
      this.saving.set(false);
      this.dialogRef.disableClose = false;
    }
  }

  private message(error: unknown, fallback: string): string {
    return error && typeof error === 'object' && 'message' in error ? String(error.message) : fallback;
  }
}
