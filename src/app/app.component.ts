import { Component, OnInit } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './services/auth.service';
import { LibraryService } from './services/library.service';
import { VotingSessionService } from './services/voting-session.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  isCreatingSession = false;

  constructor(
    readonly auth: AuthService,
    readonly library: LibraryService,
    readonly theme: ThemeService,
    private readonly votingSessions: VotingSessionService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.auth.initialize();
  }

  async createSession(): Promise<void> {
    this.isCreatingSession = true;
    try {
      await this.votingSessions.createAndOpen(this.library.games());
    } catch (error) {
      this.snackBar.open(
        error instanceof Error ? error.message : 'Unable to start a voting session.',
        'Dismiss',
        { duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom' },
      );
    } finally {
      this.isCreatingSession = false;
    }
  }
}
