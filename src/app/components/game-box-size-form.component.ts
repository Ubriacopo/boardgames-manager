import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import type { BoxDimensions, BoxSizeSelection, GameBoxSize } from '../../entities/BoardGame';
import { estimatedDimensions, GameCatalogService, validateDimensions } from '../services/game-catalog.service';

@Component({
  selector: 'app-game-box-size-form',
  standalone: true,
  imports: [FormsModule, MatButtonModule],
  templateUrl: './game-box-size-form.component.html',
})
export class GameBoxSizeFormComponent implements OnChanges {
  @Input({ required: true }) gameId = '';
  @Input() selectedSizeId: string | null = null;
  @Input() customDimensions: BoxDimensions | null = null;
  @Input() saving = false;
  @Input() submitLabel = 'Save box size';
  @Input() error = '';
  @Output() readonly selectionSave = new EventEmitter<BoxSizeSelection>();
  readonly sizes = signal<GameBoxSize[]>([]);
  readonly loading = signal(true);
  readonly publishing = signal(false);
  readonly feedback = signal('');
  readonly loadError = signal('');
  sizeId: string | null = null;
  customize = true;
  dimensions = { ...estimatedDimensions };
  label = '';
  country = '';
  private loadVersion = 0;

  constructor(private readonly catalog: GameCatalogService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gameId']) void this.load();
    else if (changes['selectedSizeId'] || changes['customDimensions']) this.resetSelection();
  }

  async load(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading.set(true); this.loadError.set(''); this.feedback.set('');
    try {
      const sizes = await this.catalog.sizes(this.gameId);
      if (version !== this.loadVersion) return;
      this.sizes.set(sizes);
      this.resetSelection();
    } catch (error) {
      if (version === this.loadVersion) this.loadError.set(this.message(error));
    } finally { if (version === this.loadVersion) this.loading.set(false); }
  }

  private resetSelection(): void {
    this.sizeId = this.selectedSizeId;
    this.customize = !!this.customDimensions || !this.sizeId;
    this.dimensions = { ...(this.customDimensions ?? this.variantDimensions()) };
  }

  chooseSize(id: string | null): void {
    this.sizeId = id;
    this.customize = !id;
    this.dimensions = { ...this.variantDimensions() };
    this.feedback.set('');
  }

  toggleCustom(value: boolean): void {
    this.customize = value;
    if (!value) this.dimensions = { ...this.variantDimensions() };
  }

  private variantDimensions(): BoxDimensions {
    const size = this.sizes().find(size => size.id === this.sizeId);
    return size ? { width: size.width_mm, height: size.height_mm, depth: size.depth_mm } : estimatedDimensions;
  }

  submit(): void {
    this.feedback.set('');
    try {
      if (this.customize) validateDimensions(this.dimensions);
      this.selectionSave.emit({ sizeId: this.sizeId, customDimensions: this.customize ? { ...this.dimensions } : null });
    } catch (error) { this.feedback.set(this.message(error)); }
  }

  async publish(): Promise<void> {
    if (this.publishing() || this.saving) return;
    this.publishing.set(true); this.feedback.set('');
    try {
      const size = await this.catalog.publishSize(this.gameId, this.label, this.country, this.dimensions);
      this.sizes.update(sizes => [...sizes, size]);
      this.sizeId = size.id; this.customize = false; this.label = ''; this.country = '';
      this.feedback.set('Size variant published and selected. Save to apply it to your copy.');
    } catch (error) { this.feedback.set(this.message(error)); }
    finally { this.publishing.set(false); }
  }

  private message(error: unknown): string {
    return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to load or save box sizes.';
  }
}
