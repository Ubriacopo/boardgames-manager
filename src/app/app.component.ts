import { Component, OnInit } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './services/auth.service';
import { LibraryService } from './services/library.service';
import { VotingSessionService } from './services/voting-session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  isCreatingSession = false;

  constructor(
    readonly auth: AuthService,
    readonly library: LibraryService,
    private readonly votingSessions: VotingSessionService,
  ) {}

  ngOnInit(): void {
    this.auth.initialize();
  }

  async createSession(): Promise<void> {
    this.isCreatingSession = true;
    try {
      await this.votingSessions.createAndOpen(this.library.games());
    } catch (error) {
      this.library.error.set(error instanceof Error ? error.message : 'Unable to start a voting session.');
    } finally {
      this.isCreatingSession = false;
    }
  }
}
