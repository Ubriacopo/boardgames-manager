import {Component, Input} from '@angular/core';
import {CdkDrag} from '@angular/cdk/drag-drop';
import type {BoardGame} from '../../entities/BoardGame';
import {spineDimensions} from '../../entities/GamePlacement';
import {GameSpineComponent} from './game-spine.component';
import {GameCoverService} from '../services/game-cover.service';
import type {LibraryBox} from '../services/library.service';

@Component({
    selector: 'button[app-kallax-cube-face], div[app-kallax-cube-face]',
    standalone: true,
    imports: [CdkDrag, GameSpineComponent],
    template: `
        <span class="relative z-1 col-start-1 row-start-1 self-start text-[.68rem] font-bold text-[#cbb9a9] uppercase max-[650px]:text-[.56rem]">{{ box.description }}</span>
        <div class="col-start-1 row-start-1 flex h-full w-full flex-nowrap items-end gap-0 overflow-hidden max-[650px]:gap-px
                    [&.horizontal]:flex-wrap [&.horizontal]:content-end" [class.horizontal]="box.layout_direction === 'horizontal'">
            @for (game of games; track game.id) {
                <span app-game-spine cdkDrag [cdkDragData]="game.id" [cdkDragDisabled]="!spineDraggable"
                      [horizontal]="box.layout_direction === 'horizontal'" [style.width.%]="width(game)" [style.height.%]="height(game)"
                      [title]="spineDraggable ? 'Drag ' + game.name : game.name" [name]="game.name" [imageUrl]="covers.sideForGame(game)"
                      [spineDraggable]="spineDraggable" [showLabel]="labelsVisible"></span>
            }
        </div>
        <small class="relative z-1 col-start-1 row-start-1 self-end text-right text-[.68rem] font-bold text-[#cbb9a9] uppercase max-[650px]:text-[.56rem]">{{ capacity }}/{{ box.capacity }}</small>
    `,
})
export class KallaxCubeFaceComponent {
    @Input({required: true}) box!: LibraryBox;
    @Input({required: true}) games: BoardGame[] = [];
    @Input() spineDraggable = false;
    @Input() labelsVisible = true;

    constructor(readonly covers: GameCoverService) {}

    get capacity(): number { return this.games.reduce((total, game) => total + game.size, 0); }
    width(game: BoardGame): number { return Math.min(100, spineDimensions(game, this.box.layout_direction).width / this.box.inner_width_mm * 100); }
    height(game: BoardGame): number { return Math.min(100, spineDimensions(game, this.box.layout_direction).height / this.box.inner_height_mm * 100); }
}
