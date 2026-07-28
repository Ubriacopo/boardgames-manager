import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LibraryService } from '../services/library.service';

@Component({
  standalone: true,
  imports: [DecimalPipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './game-detail.component.html',
})
export class GameDetailComponent implements OnInit {
  gameId = '';
  constructor(readonly library: LibraryService, private readonly route: ActivatedRoute) {}
  ngOnInit(): void { this.gameId = this.route.snapshot.paramMap.get('id') ?? ''; }
  location(boxId: number | null): string {
    return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
  }
}
