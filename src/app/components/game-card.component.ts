import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import type {BoardGame} from '../../entities/BoardGame';
import type {BggGameMetadata} from '../../utils/bggData';

@Component({
    selector: 'app-game-card',
    standalone: true,
    imports: [DecimalPipe, RouterLink, MatIconModule],
    templateUrl: './game-card.component.html',
})
export class GameCardComponent {
    @Input({required: true}) game!: BoardGame;
    @Input() metadata?: BggGameMetadata;
    @Input() location = 'Unassigned';
    @Input() actionLabel = '';
    @Input() actionIcon = 'add';
    @Output() readonly action = new EventEmitter<BoardGame>();
}
