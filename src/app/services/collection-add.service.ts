import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {firstValueFrom} from 'rxjs';
import type {BoardGame, GameDefinition} from '../../entities/BoardGame';
import {AddGameDialogComponent} from '../components/add-game-dialog.component';

@Injectable({providedIn: 'root'})
export class CollectionAddService {
    constructor(private readonly dialog: MatDialog, private readonly snackBar: MatSnackBar) {
    }

    async add(game: Pick<GameDefinition, 'id' | 'name'>, _special = false): Promise<BoardGame | undefined> {
        const copy: BoardGame | undefined = await firstValueFrom(
                this.dialog.open(AddGameDialogComponent, {data: game, width: '640px', maxWidth: '95vw'}).afterClosed());
        if (copy) this.snackBar.open(copy.game_box_size_id ? `${copy.name} added to your collection` : `${copy.name} added. No default format yet; box dimensions are estimates.`, 'Dismiss', {duration: 5000});
        return copy;
    }
}
