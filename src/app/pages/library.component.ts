import { GameSpineComponent } from '../components/game-spine.component';
import {DecimalPipe} from '@angular/common';
import {Component, computed, HostListener, Inject, signal} from '@angular/core';
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
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {firstValueFrom} from 'rxjs';
import type {BoardGame} from '../../entities/BoardGame';
import {LibraryService, type BoxLayoutDirection, type LibraryBox} from '../services/library.service';
import {CollectionListComponent} from '../components/collection-list.component';
import {GameListRowComponent} from '../components/game-list-row.component';

@Component({
    standalone: true,
    imports: [MatButtonModule, MatDialogModule],
    template: `<h2 mat-dialog-title>Delete library?</h2>
        <mat-dialog-content>Delete “{{ data.name }}”? Its owned games will become unassigned.</mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" (click)="dialog.close(false)">Cancel</button>
            <button mat-flat-button type="button" color="warn" (click)="dialog.close(true)">Delete</button>
        </mat-dialog-actions>`,
})
export class ConfirmDeleteLibraryDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) readonly data: {name: string}, readonly dialog: MatDialogRef<ConfirmDeleteLibraryDialogComponent, boolean>) {}
}

@Component({
    standalone: true,
    imports: [
        GameSpineComponent,
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
        MatDialogModule,
        MatSnackBarModule,
        CollectionListComponent,
        GameListRowComponent
    ],
    templateUrl: './library.component.html',
})
export class LibraryComponent {
    get activeTab(): 'shelf' | 'recent' | 'collection' { return this.library.activeTab(); }
    set activeTab(tab: 'shelf' | 'recent' | 'collection') { this.library.activeTab.set(tab); }
    creatingLibrary = false;
    newLibraryName = '';
    newLibraryColor = '#287f82';
    readonly savingColor = signal(false);
    settingsOpen = false;
    draftLibraryName = '';
    draftLibraryColor = '#287f82';
    draftCubeCount = 0;
    selectedBox: number | null = null;
    selectedBoxLabel = '';
    unassignedOpen = false;
    swipeDirection: Record<string, 'favorite' | 'delete' | null> = {};
    gridColumns = 4;
    gridRows = 4;
    kallaxZoom = 1;
    draftColumns = 4;
    draftRows = 4;
    layoutOpen = false;
    changingCubes = false;
    readonly assignedCount = computed(() => this.library.shelfGames().length);

    constructor(
        readonly library: LibraryService,
        route: ActivatedRoute,
        private readonly snackBar: MatSnackBar,
        private readonly dialog: MatDialog,
    ) {
        const requestedTab = route.snapshot.queryParamMap.get('tab');
        if (requestedTab === 'shelf' || requestedTab === 'recent' || requestedTab === 'collection') this.activeTab = requestedTab;
        this.syncLayout();
    }

    private syncLayout(): void {
        const library = this.library;
        const boxCount = Math.max(1, library.boxes().length);
        const saved = library.library();
        const savedFits = saved?.shelf_columns && saved?.shelf_rows && saved.shelf_columns * saved.shelf_rows >= boxCount;
        this.gridColumns = savedFits ? saved.shelf_columns! : Math.ceil(Math.sqrt(boxCount));
        this.gridRows = savedFits ? saved.shelf_rows! : Math.ceil(boxCount / this.gridColumns);
        this.draftColumns = this.gridColumns;
        this.draftRows = this.gridRows;
    }

    async selectLibrary(id: string): Promise<void> {
        if (id === '__create__') { this.creatingLibrary = true; return; }
        this.selectedBox = null;
        this.layoutOpen = false;
        await this.library.selectLibrary(id);
        this.syncLayout();
    }

    async createLibrary(): Promise<void> {
        try {
            await this.library.createLibrary(this.newLibraryName, this.newLibraryColor);
            this.selectedBox = null;
            this.syncLayout();
            this.creatingLibrary = false;
            this.newLibraryName = '';
        } catch (error) {
            this.snackBar.open(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to create a library.', 'Dismiss');
        }
    }

    async saveLibraryColor(id: string, input: HTMLInputElement): Promise<void> {
        if (this.savingColor()) return;
        this.savingColor.set(true);
        try {
            await this.library.setLibraryColor(id, input.value);
        } catch (error) {
            this.snackBar.open(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to save library color.', 'Dismiss');
        } finally {
            input.value = this.library.library()?.color ?? '#287f82';
            this.savingColor.set(false);
        }
    }

    openLibrarySettings(): void {
        const current = this.library.library();
        if (!current) return;
        this.draftLibraryName = current.name;
        this.draftLibraryColor = current.color || '#287f82';
        this.draftCubeCount = this.library.boxes().length;
        this.openLayoutSettings();
        this.settingsOpen = true;
    }

    async saveLibrarySettings(): Promise<void> {
        const current = this.library.library();
        if (!current || this.changingCubes) return;
        this.changingCubes = true;
        try {
            await this.library.renameLibrary(current.id, this.draftLibraryName);
            await this.library.setLibraryColor(current.id, this.draftLibraryColor);
            while (this.library.boxes().length < this.draftCubeCount) await this.library.addBox();
            while (this.library.boxes().length > this.draftCubeCount) await this.library.removeLastBox();
            await this.library.saveShelfLayout(this.draftColumns, this.draftRows);
            this.gridColumns = this.draftColumns;
            this.gridRows = this.draftRows;
            this.settingsOpen = false;
        } catch (error) {
            this.syncLayout();
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to save library settings.', 'Dismiss');
        } finally { this.changingCubes = false; }
    }

    async deleteCurrentLibrary(): Promise<void> {
        const current = this.library.library();
        if (!current || this.library.libraries().length <= 1) return;
        const confirmed = await firstValueFrom(this.dialog.open(ConfirmDeleteLibraryDialogComponent, {
            data: {name: current.name},
            width: 'min(92vw, 420px)',
        }).afterClosed());
        if (!confirmed) return;
        try {
            await this.library.deleteLibrary(current.id);
            this.selectedBox = null;
            this.syncLayout();
            this.settingsOpen = false;
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to delete this library.', 'Dismiss');
        }
    }

    get gridLayoutValid(): boolean {
        return Number.isInteger(this.draftColumns) && Number.isInteger(this.draftRows) &&
            this.draftColumns > 0 && this.draftRows > 0 &&
            this.draftColumns <= 12 && this.draftRows <= 12 &&
            this.draftColumns * this.draftRows >= (this.settingsOpen ? this.draftCubeCount : this.library.boxes().length);
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
        const box = this.library.boxes().find((item) => item.id === boxId);
        this.selectedBoxLabel = box?.description ?? box?.label ?? `Cube ${boxId}`;
    }

    async applyGridLayout(): Promise<void> {
        if (!this.gridLayoutValid || this.changingCubes) return;
        this.changingCubes = true;
        const columns = this.draftColumns;
        const rows = this.draftRows;
        try {
            await this.library.saveShelfLayout(columns, rows);
            this.gridColumns = columns;
            this.gridRows = rows;
            this.layoutOpen = false;
        } catch (error) {
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to save shelf layout.', 'Dismiss');
        } finally { this.changingCubes = false; }
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
        this.draftCubeCount += 1;
        if (this.draftColumns * this.draftRows < this.draftCubeCount) {
            if (this.draftColumns <= this.draftRows) this.draftColumns += 1;
            else this.draftRows += 1;
        }
    }

    async removeCube(): Promise<void> {
        this.draftCubeCount = Math.max(1, this.draftCubeCount - 1);
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
        return this.library.shelfGames()
            .filter((game) => (this.library.placement(game.id)?.container_box_id ?? game.box) === id)
            .sort((left, right) => (this.library.placement(left.id)?.sort_order ?? 0) -
                (this.library.placement(right.id)?.sort_order ?? 0));
    }

    boxDirection(box: LibraryBox): BoxLayoutDirection {
        return box.layout_direction;
    }

    spineWidthPercent(game: BoardGame, box: LibraryBox): number {
        const width = this.boxDirection(box) === 'vertical' ? game.box_depth_mm : game.box_width_mm;
        return Math.min(100, (width / box.inner_width_mm) * 100);
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

    async renameSelectedCube(): Promise<void> {
        const box = this.selectedBoxInfo;
        if (!box) return;
        const label = this.selectedBoxLabel.trim();
        const currentLabel = box.description ?? box.label ?? '';
        if (!label || label === currentLabel) {
            this.selectedBoxLabel = currentLabel;
            return;
        }
        try {
            await this.library.renameBox(box.id, label);
        } catch (error) {
            this.selectedBoxLabel = currentLabel;
            this.snackBar.open(error instanceof Error ? error.message : 'Unable to rename this cube.', 'Dismiss');
        }
    }

    capacity(id: number): number {
        return this.gamesInBox(id).reduce((sum, game) => sum + game.size, 0);
    }

    location(id: number | null): string {
        return this.library.location(id);
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
