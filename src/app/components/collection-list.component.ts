import {Component} from '@angular/core';
import {CdkDragEnd, CdkDragMove} from '@angular/cdk/drag-drop';
import {FormsModule} from '@angular/forms';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import type {BoardGame} from '../../entities/BoardGame';
import {LibraryService} from '../services/library.service';
import {GameListRowComponent} from './game-list-row.component';

@Component({
    selector: 'app-collection-list',
    standalone: true,
    imports: [FormsModule, GameListRowComponent, MatDividerModule, MatIconModule, MatSnackBarModule],
    templateUrl: './collection-list.component.html',
})
export class CollectionListComponent {
    query = '';
    sort = 'name';
    swipeDirection: Record<string, 'favorite' | 'delete' | null> = {};

    constructor(readonly library: LibraryService, private readonly snackBar: MatSnackBar) {
    }

    filtered(): BoardGame[] {
        const query = this.query.trim().toLowerCase();
        const metadata = this.library.metadata();
        return this.library.games().filter((game) => {
            const meta = metadata[game.id];
            return !query || [game.name, game.release_year, ...(meta?.themes ?? [])].join(' ').toLowerCase().includes(query);
        }).sort((a, b) => {
            if (this.sort === 'newest') return b.release_year - a.release_year;
            if (this.sort === 'rating') return (metadata[b.id]?.avgRating ?? 0) - (metadata[a.id]?.avgRating ?? 0);
            return a.name.localeCompare(b.name);
        });
    }

    location(boxId: number | null): string {
        return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
    }

    async favorite(game: BoardGame): Promise<void> {
        try {
            await this.library.setFavorite(game.id, true);
            this.snackBar.open(`${game.name} added to favorites`, 'Dismiss', {duration: 3000});
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to favorite this game.', 'Dismiss');
        }
    }

    async remove(game: BoardGame): Promise<void> {
        try {
            await this.library.removeGame(game.id);
            const notice = this.snackBar.open(`${game.name} removed from your library`, 'Undo', {duration: 5000});
            notice.onAction().subscribe(() => void this.library.restoreGame(game));
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to remove this game.', 'Dismiss');
        }
    }

    trackSwipe(gameId: string, event: CdkDragMove): void {
        this.swipeDirection[gameId] = event.distance.x <= -48 ? 'favorite' : event.distance.x >= 48 ? 'delete' : null;
    }

    finishSwipe(game: BoardGame, event: CdkDragEnd): void {
        const distance = event.distance.x;
        event.source.reset();
        this.swipeDirection[game.id] = null;
        if (distance <= -72) void this.favorite(game);
        if (distance >= 72) void this.remove(game);
    }
}
