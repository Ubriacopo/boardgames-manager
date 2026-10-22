import {Component, TemplateRef, ViewChild, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatIconModule} from '@angular/material/icon';
import {AuthService} from '../services/auth.service';

@Component({
    standalone: true,
    imports: [FormsModule, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
    templateUrl: './login.component.html',
})
export class LoginComponent {
    mode: 'sign-in' | 'sign-up' = 'sign-in';
    handle = '';
    email = '';
    password = '';
    readonly working = signal(false);
    readonly message = signal('');
    readonly loadingLabel = signal('Signing you in…');
    @ViewChild('loadingDialog', {static: true}) private loadingDialog!: TemplateRef<unknown>;
    isError = false;

    constructor(private readonly auth: AuthService, private readonly router: Router, private readonly dialog: MatDialog) {
    }

    async submit(): Promise<void> {
        if (this.working()) return;
        this.working.set(true);
        this.loadingLabel.set(this.mode === 'sign-in' ? 'Signing you in…' : 'Creating your account…');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let overlay: MatDialogRef<unknown> | undefined;
        this.message.set('');
        this.isError = false;
        try {
            overlay = this.dialog.open(this.loadingDialog, {
                disableClose: true,
                closeOnNavigation: false,
                autoFocus: 'dialog',
                ariaLabel: 'Please wait',
                width: '360px',
                maxWidth: '92vw',
                panelClass: 'login-loading-dialog',
                backdropClass: 'login-loading-backdrop',
                enterAnimationDuration: reducedMotion ? 0 : 150,
                exitAnimationDuration: reducedMotion ? 0 : 100,
            });
            if (this.mode === 'sign-in') await this.auth.signIn(this.email, this.password);
            else if (!await this.auth.signUp(this.email, this.password, this.handle)) {
                this.message.set('Check your inbox to confirm your account, then sign in.');
                return;
            }
            this.loadingLabel.set('Opening your library…');
            await this.router.navigate(['/library']);
        } catch (error) {
            this.isError = true;
            this.message.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to sign in.');
        } finally {
            overlay?.close();
            this.working.set(false);
        }
    }

    toggle(): void {
        if (this.working()) return;
        this.mode = this.mode === 'sign-in' ? 'sign-up' : 'sign-in';
        this.message.set('');
    }
}
