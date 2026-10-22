import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DisplaySettingsService {
  readonly zoomLevels = [100, 110, 125, 150, 175, 200] as const;
  private readonly storageKey = 'kallboard-display-zoom';
  private readonly zoomValue = signal(100);
  readonly zoom = this.zoomValue.asReadonly();

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    let saved = 100;
    try { saved = Number(localStorage.getItem(this.storageKey)) || 100; }
    catch { /* Display settings still work when browser storage is unavailable. */ }
    this.setZoom(saved);
  }

  setZoom(value: number): void {
    const zoom = this.zoomLevels.find(level => level === value) ?? 100;
    this.zoomValue.set(zoom);
    this.document.documentElement.style.setProperty('--display-scale', String(zoom / 100));
    try { localStorage.setItem(this.storageKey, String(zoom)); }
    catch { /* Keep the chosen zoom for this session. */ }
  }
}
