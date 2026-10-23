import {DecimalPipe} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CdkDrag, CdkDragEnd, CdkDragMove} from '@angular/cdk/drag-drop';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';

@Component({
    selector: 'app-game-list-row',
    standalone: true,
    host: {class: 'block'},
    imports: [CdkDrag, DecimalPipe, MatButtonModule, MatIconModule, RouterLink],
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

    get libraryInk(): string {
        const hex = /^#[0-9a-fA-F]{6}$/.test(this.libraryColor) ? this.libraryColor : '#287f82';
        const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
                .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        return luminance > 0.179 ? '#000000' : '#ffffff';
    }

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
    @Output() readonly defaultAdd = new EventEmitter<void>();
    @Output() readonly specialAdd = new EventEmitter<void>();
    @Output() readonly dragMoved = new EventEmitter<CdkDragMove>();
    @Output() readonly dragEnded = new EventEmitter<CdkDragEnd>();
}
