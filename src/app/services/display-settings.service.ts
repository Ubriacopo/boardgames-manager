import {DOCUMENT} from '@angular/common';
import {Inject, Injectable, signal} from '@angular/core';

@Injectable({providedIn: 'root'})
export class DisplaySettingsService {
    readonly zoomLevels = [100, 110, 125, 150, 175, 200] as const;
    private readonly storageKey = 'kallboard-display-zoom';
    private readonly zoomValue = signal(100);
    readonly zoom = this.zoomValue.asReadonly();
    private readonly gameLabelsStorageKey = 'kallboard-kallax-labels';
    private readonly gameLabelsValue = signal(true);
    readonly showGameLabels = this.gameLabelsValue.asReadonly();

    constructor(@Inject(DOCUMENT) private readonly document: Document) {
        let saved = 100;
        try {
            saved = Number(localStorage.getItem(this.storageKey)) || 100;
        } catch { /* Display settings still work when browser storage is unavailable. */
        }
        this.setZoom(saved);
        try {
            this.gameLabelsValue.set(localStorage.getItem(this.gameLabelsStorageKey) !== 'false');
        } catch { /* Labels remain enabled when browser storage is unavailable. */
        }
    }

    setZoom(value: number): void {
        const zoom = this.zoomLevels.find(level => level === value) ?? 100;
        this.zoomValue.set(zoom);
        this.document.documentElement.style.setProperty('--display-scale', String(zoom / 100));
        try {
            localStorage.setItem(this.storageKey, String(zoom));
        } catch { /* Keep the chosen zoom for this session. */
        }
    }

    setGameLabels(visible: boolean): void {
        this.gameLabelsValue.set(visible);
        try {
            localStorage.setItem(this.gameLabelsStorageKey, String(visible));
        } catch { /* Keep the chosen label visibility for this session. */
        }
    }
}
