import {DecimalPipe} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CdkDrag, CdkDragEnd, CdkDragHandle, CdkDragMove} from '@angular/cdk/drag-drop';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {LibraryChipComponent} from './library-chip.component';

@Component({
    selector: 'app-game-list-row',
    standalone: true,
    host: {class: 'block'},
    imports: [CdkDrag, CdkDragHandle, DecimalPipe, MatButtonModule, MatIconModule, RouterLink, LibraryChipComponent],
    templateUrl: './game-list-row.component.html',
})
export class GameListRowComponent {
    @Input({required: true}) name = '';
    @Input({required: true}) year: number | null = null;
    @Input({required: true}) link: unknown[] = [];
    @Input() imageUrl: string | null = null;
    @Input() edition: string | null = null;
    @Input() category = '';
    @Input() location = '';
    @Input() libraryName = '';
    @Input() libraryColor = '#287f82';

    @Input() rank: number | null = null;
    @Input() rating: number | null = null;
    @Input() favorite = false;
    @Input() draggable = false;
    @Input() swipeDirection: 'favorite' | 'delete' | null = null;
    @Input() actionLink?: unknown[];
    @Input() actionIcon = '';
    @Input() actionLabel = '';
    @Input() addActions = false;
    @Input() adding = false;
    @Input() secondaryText = '';
    @Input() cubeActions = false;
    @Input() rotateLabel = '';
    @Input() reorderable = false;
    @Input() cubeBusy = false;
    @Input() dragData = '';
    @Output() readonly reorderStep = new EventEmitter<number>();
    @Output() readonly rotate = new EventEmitter<void>();
    @Output() readonly unassign = new EventEmitter<void>();
    @Output() readonly defaultAdd = new EventEmitter<void>();
    @Output() readonly specialAdd = new EventEmitter<void>();
    @Output() readonly dragMoved = new EventEmitter<CdkDragMove>();
    @Output() readonly dragEnded = new EventEmitter<CdkDragEnd>();
}
