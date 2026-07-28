import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  mode: 'sign-in' | 'sign-up' = 'sign-in';
  email = '';
  password = '';
  working = false;
  message = '';
  isError = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  async submit(): Promise<void> {
    this.working = true;
    this.message = '';
    try {
      if (this.mode === 'sign-in') await this.auth.signIn(this.email, this.password);
      else if (!await this.auth.signUp(this.email, this.password)) {
        this.message = 'Check your inbox to confirm your account, then sign in.';
        return;
      }
      await this.router.navigate(['/library']);
    } catch (error) {
      this.isError = true;
      this.message = error instanceof Error ? error.message : 'Unable to sign in.';
    } finally {
      this.working = false;
    }
  }

  toggle(): void {
    this.mode = this.mode === 'sign-in' ? 'sign-up' : 'sign-in';
    this.message = '';
  }
}
