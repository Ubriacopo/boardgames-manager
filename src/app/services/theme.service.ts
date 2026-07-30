import { Injectable, signal } from '@angular/core';

export type AppTheme = 'system' | 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly selected = signal<AppTheme>('system');
  private readonly media = window.matchMedia('(prefers-color-scheme: light)');

  constructor() {
    const saved = localStorage.getItem('meeple-house-theme');
    this.set(saved === 'dark' || saved === 'light' ? saved : 'system');
    this.media.addEventListener('change', () => {
      if (this.selected() === 'system') this.apply('system');
    });
  }

  set(theme: AppTheme): void {
    this.selected.set(theme);
    localStorage.setItem('meeple-house-theme', theme);
    this.apply(theme);
  }

  private apply(theme: AppTheme): void {
    document.documentElement.dataset['theme'] =
      theme === 'system' ? (this.media.matches ? 'light' : 'dark') : theme;
  }
}
