import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import type { BoxDimensions, BoxSizeSelection, GameBoxSize } from '../../entities/BoardGame';
import { estimatedDimensions, GameCatalogService, validateDimensions } from '../services/game-catalog.service';
import {AuthService} from '../services/auth.service';

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
  @Input() preferDefault = false;
  @Input() externalSubmit = false;
  @Input() error = '';
  @Output() readonly selectionSave = new EventEmitter<BoxSizeSelection>();
  readonly sizes = signal<GameBoxSize[]>([]);
  readonly loading = signal(true);
  readonly publishing = signal(false);
  readonly feedback = signal('');
  readonly loadError = signal('');
  readonly format = signal<Awaited<ReturnType<GameCatalogService['formatStatus']>> | null>(null);
  readonly choosingDefault = signal(false);
  sizeId: string | null = null;
  customize = true;
  dimensions = this.toCentimetres(estimatedDimensions);
  label = '';
  country = '';
  private loadVersion = 0;

  constructor(private readonly catalog: GameCatalogService, readonly auth: AuthService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gameId']) void this.load();
    else if (changes['selectedSizeId'] || changes['customDimensions']) this.resetSelection();
  }

  async load(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading.set(true); this.loadError.set(''); this.feedback.set('');
    try {
      const [sizes, format] = await Promise.all([this.catalog.sizes(this.gameId), this.catalog.formatStatus(this.gameId)]);
      if (version !== this.loadVersion) return;
      this.sizes.set(sizes);
      this.format.set(format);
      this.resetSelection();
    } catch (error) {
      if (version === this.loadVersion) this.loadError.set(this.message(error));
    } finally { if (version === this.loadVersion) this.loading.set(false); }
  }

  private resetSelection(): void {
    this.sizeId = this.selectedSizeId ?? (this.preferDefault ? this.format()?.defaultId ?? null : null);
    this.customize = !!this.customDimensions || !this.sizeId;
    this.dimensions = this.toCentimetres(this.customDimensions ?? this.variantDimensions());
  }

  chooseSize(id: string | null): void {
    this.sizeId = id;
    this.customize = !id;
    this.dimensions = this.toCentimetres(this.variantDimensions());
    this.feedback.set('');
  }

  toggleCustom(value: boolean): void {
    this.customize = value;
    if (!value) this.dimensions = this.toCentimetres(this.variantDimensions());
  }

  private variantDimensions(): BoxDimensions {
    const size = this.sizes().find(size => size.id === this.sizeId);
    return size ? { width: size.width_mm, height: size.height_mm, depth: size.depth_mm } : estimatedDimensions;
  }

  async chooseDefault(sizeId: string | null, admin = false): Promise<void> {
    if (this.choosingDefault()) return;
    this.choosingDefault.set(true); this.feedback.set('');
    const gameId = this.gameId;
    try {
      if (admin) await this.catalog.setDefaultFormat(gameId, sizeId);
      else await this.catalog.voteFormat(gameId, sizeId);
      const format = await this.catalog.formatStatus(gameId);
      if (gameId === this.gameId) this.format.set(format);
    } catch (error) { this.feedback.set(this.message(error)); }
    finally { this.choosingDefault.set(false); }
  }

  private toCentimetres(dimensions: BoxDimensions): BoxDimensions {
    return { width: dimensions.width / 10, height: dimensions.height / 10, depth: dimensions.depth / 10 };
  }

  private toMillimetres(): BoxDimensions {
    if (Object.values(this.dimensions).some(value => !Number.isFinite(value) || value < 0.1 || value > 200
      || Math.abs(value * 10 - Math.round(value * 10)) > 1e-7)) {
      throw new Error('Enter dimensions between 0.1 and 200 cm, in steps of 0.1 cm.');
    }
    // Round only floating-point noise so decimal centimetres remain integer millimetres.
    const dimensions = { width: Math.round(this.dimensions.width * 10),
      height: Math.round(this.dimensions.height * 10), depth: Math.round(this.dimensions.depth * 10) };
    validateDimensions(dimensions);
    return dimensions;
  }

  submit(): void {
    this.feedback.set('');
    try {
      this.selectionSave.emit({ sizeId: this.sizeId, customDimensions: this.customize ? this.toMillimetres() : null });
    } catch (error) { this.feedback.set(this.message(error)); }
  }

  async publish(): Promise<void> {
    if (this.publishing() || this.saving) return;
    this.publishing.set(true); this.feedback.set('');
    try {
      const size = await this.catalog.publishSize(this.gameId, this.label, this.country, this.toMillimetres());
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
