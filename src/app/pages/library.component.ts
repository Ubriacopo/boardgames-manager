import {DecimalPipe} from '@angular/common';
import {Component, computed, HostListener} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
    CdkDrag,
    CdkDragDrop,
    CdkDragEnd,
    CdkDragHandle,
    CdkDragMove,
    CdkDropList,
    CdkDropListGroup
} from '@angular/cdk/drag-drop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatDividerModule} from '@angular/material/divider';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import type {BoardGame} from '../../entities/BoardGame';
import {LibraryService, type BoxLayoutDirection, type LibraryBox} from '../services/library.service';
import {CollectionListComponent} from '../components/collection-list.component';
import {GameListRowComponent} from '../components/game-list-row.component';

@Component({
    standalone: true,
    imports: [
        DecimalPipe,
        FormsModule,
        CdkDrag,
        CdkDragHandle,
        CdkDropList,
        CdkDropListGroup,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatSnackBarModule,
        CollectionListComponent,
        GameListRowComponent
    ],
    templateUrl: './library.component.html',
})
export class LibraryComponent {
    activeTab: 'shelf' | 'recent' | 'collection' = 'shelf';
    selectedBox: number | null = null;
    unassignedOpen = false;
    swipeDirection: Record<string, 'favorite' | 'delete' | null> = {};
    gridColumns = 4;
    gridRows = 4;
    kallaxZoom = 1;
    draftColumns = 4;
    draftRows = 4;
    layoutOpen = false;
    changingCubes = false;
    readonly assignedCount = computed(() => this.library.games().length - this.library.unassigned().length);

    constructor(
        readonly library: LibraryService,
        route: ActivatedRoute,
        private readonly snackBar: MatSnackBar,
    ) {
        const requestedTab = route.snapshot.queryParamMap.get('tab');
        if (requestedTab === 'recent' || requestedTab === 'collection') this.activeTab = requestedTab;
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

    async addCube(): Promise<void> {
        this.changingCubes = true;
        try {
            await this.library.addBox();
            if (this.gridColumns * this.gridRows < this.library.boxes().length) {
                if (this.gridColumns <= this.gridRows) this.gridColumns += 1;
                else this.gridRows += 1;
            }
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to add a cube.', 'Dismiss');
        } finally {
            this.changingCubes = false;
        }
    }

    async removeCube(): Promise<void> {
        this.changingCubes = true;
        try {
            await this.library.removeLastBox();
            if (this.selectedBox && !this.library.boxes().some((box) => box.id === this.selectedBox)) {
                this.selectedBox = null;
            }
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to remove a cube.', 'Dismiss');
        } finally {
            this.changingCubes = false;
        }
    }

    async removeSelectedCube(): Promise<void> {
        if (this.selectedBox === null) return;
        try {
            await this.library.removeBox(this.selectedBox);
            this.selectedBox = null;
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to remove this cube.', 'Dismiss');
        }
    }

    async favorite(game: BoardGame): Promise<void> {
        try {
            await this.library.setFavorite(game.id, true);
            this.snackBar.open(`${game.name} added to favorites`, 'Dismiss', {duration: 3000});
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to favorite this game.', 'Dismiss');
        }
    }

    async removeFromLibrary(game: BoardGame): Promise<void> {
        try {
            await this.library.removeGame(game.id);
            const notice = this.snackBar.open(`${game.name} removed from your library`, 'Undo', {duration: 5000});
            notice.onAction().subscribe(() => void this.library.restoreGame(game));
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to remove this game.', 'Dismiss');
        }
    }

    swipeGame(game: BoardGame, event: CdkDragEnd): void {
        const distance = event.distance.x;
        event.source.reset();
        this.swipeDirection[game.id] = null;
        if (distance <= -72) void this.favorite(game);
        if (distance >= 72) void this.removeFromLibrary(game);
    }

    trackSwipe(gameId: string, event: CdkDragMove): void {
        this.swipeDirection[gameId] =
            event.distance.x <= -48 ? 'favorite' :
                event.distance.x >= 48 ? 'delete' : null;
    }

    recentlyAdded(): BoardGame[] {
        return [...this.library.games()]
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
            .slice(0, 8);
    }

    gamesInBox(id: number): BoardGame[] {
        return this.library.games()
            .filter((game) => (this.library.placement(game.id)?.container_box_id ?? game.box) === id)
            .sort((left, right) => (this.library.placement(left.id)?.sort_order ?? 0) -
                (this.library.placement(right.id)?.sort_order ?? 0));
    }

    boxDirection(box: LibraryBox): BoxLayoutDirection {
        return box.layout_direction;
    }

    spineWidthPercent(game: BoardGame, box: LibraryBox): number {
        return Math.min(100, (game.box_width_mm / box.inner_width_mm) * 100);
    }

    spineHeightPercent(game: BoardGame, box: LibraryBox): number {
        const height = this.boxDirection(box) === 'vertical' ? game.box_height_mm : game.box_depth_mm;
        return Math.min(100, (height / box.inner_height_mm) * 100);
    }

    async toggleSelectedCubeDirection(): Promise<void> {
        const box = this.selectedBoxInfo;
        if (!box) return;
        const direction: BoxLayoutDirection = this.boxDirection(box) === 'vertical' ? 'horizontal' : 'vertical';
        try {
            await this.library.setBoxLayoutDirection(box.id, direction);
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to change cube layout.', 'Dismiss');
        }
    }

    capacity(id: number): number {
        return this.gamesInBox(id).reduce((sum, game) => sum + game.size, 0);
    }

    location(id: number | null): string {
        return this.library.boxes().find((box) => box.id === id)?.description ?? 'Unassigned';
    }

    initials(name: string): string {
        return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('');
    }

    drop(box: number, event: CdkDragDrop<BoardGame[]>): void {
        void this.move(event.item.data as string, box, event.currentIndex);
    }

    unassign(event: CdkDragDrop<BoardGame[]>): void {
        void this.move(event.item.data as string, null, event.currentIndex);
    }

    async move(gameId: string, box: number | null, index?: number): Promise<void> {
        try {
            await this.library.moveGame(gameId, box, index);
        } catch (error) {
            this.library.error.set(error instanceof Error ? error.message : 'Unable to move this game.');
        }
    }
}
