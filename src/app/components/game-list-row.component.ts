import {DecimalPipe} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CdkDrag, CdkDragEnd, CdkDragMove} from '@angular/cdk/drag-drop';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';

@Component({
    selector: 'app-game-list-row',
    standalone: true,
    imports: [CdkDrag, DecimalPipe, MatButtonModule, MatIconModule, RouterLink],
    templateUrl: './game-list-row.component.html',
})
export class GameListRowComponent {
    @Input({required: true}) name = '';
    @Input({required: true}) year: number | null = null;
    @Input({required: true}) link: unknown[] = [];
    @Input() imageUrl: string | null = null;
    @Input() category = '';
    @Input() location = '';
    @Input() rank: number | null = null;
    @Input() rating: number | null = null;
    @Input() favorite = false;
    @Input() draggable = false;
    @Input() swipeDirection: 'favorite' | 'delete' | null = null;
    @Input() actionLink?: unknown[];
    @Input() actionIcon = '';
    @Input() actionLabel = '';
    @Output() readonly dragMoved = new EventEmitter<CdkDragMove>();
    @Output() readonly dragEnded = new EventEmitter<CdkDragEnd>();
}
