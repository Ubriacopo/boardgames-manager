import {Component, OnInit, signal} from '@angular/core';
import {ProfileAvatarComponent} from '../components/profile-avatar.component';
import {FormsModule} from '@angular/forms';
import {FriendsService, SocialProfile} from '../services/friends.service';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {LibraryService} from '../services/library.service';
import {ThemeService} from '../services/theme.service';
import {DisplaySettingsService} from '../services/display-settings.service';

@Component({
    standalone: true,
    imports: [FormsModule, MatButtonModule, MatIconModule, RouterLink, ProfileAvatarComponent],
    templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
    handle = '';
    displayName = '';
    connectionMode: SocialProfile['connection_mode'] = 'approval';
    readonly publicProfile = signal<SocialProfile | null>(null);
    readonly avatarUploading = signal(false);
    readonly socialLoading = signal(true);
    readonly socialReady = signal(false);
    readonly saving = signal(false);
    readonly socialError = signal('');
    readonly socialNotice = signal('');

    async ngOnInit(): Promise<void> {
        this.socialLoading.set(true);
        this.socialError.set('');
        try {
            const profile = await this.friends.ensureProfile(this.auth.session()!.user.id);
            this.publicProfile.set(profile);
            this.handle = profile.handle;
            this.displayName = profile.display_name;
            this.connectionMode = profile.connection_mode;
            this.socialReady.set(true);
        } catch (error) { this.socialError.set(this.message(error)); }
        finally { this.socialLoading.set(false); }
    }

    async saveSocialProfile(): Promise<void> {
        this.saving.set(true); this.socialError.set(''); this.socialNotice.set('');
        try {
            await this.friends.saveProfile(this.auth.session()!.user.id, this.handle, this.handle.trim().toLowerCase(), this.connectionMode);
            this.handle = this.handle.trim().toLowerCase();
            this.displayName = this.handle;
            this.publicProfile.update(profile => profile ? { ...profile, handle: this.handle, display_name: this.handle } : null);
            this.socialNotice.set('Your handle has been saved.');
        } catch (error) { this.socialError.set(this.message(error)); }
        finally { this.saving.set(false); }
    }

    async changeConnectionMode(mode: SocialProfile['connection_mode']): Promise<void> {
        this.saving.set(true); this.socialError.set(''); this.socialNotice.set('');
        try {
            await this.friends.saveConnectionMode(this.auth.session()!.user.id, mode);
            this.connectionMode = mode;
            this.socialNotice.set('Connection preference saved.');
        } catch (error) { this.socialError.set(this.message(error)); }
        finally { this.saving.set(false); }
    }

    async uploadAvatar(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || this.avatarUploading()) return;
        this.avatarUploading.set(true); this.socialError.set(''); this.socialNotice.set('');
        try {
            const profile = await this.friends.saveAvatar(this.auth.session()!.user.id, file);
            this.publicProfile.set(profile);
            this.socialNotice.set('Your profile picture has been updated.');
        } catch (error) { this.socialError.set(this.message(error)); }
        finally { this.avatarUploading.set(false); }
    }

    private message(error: unknown): string {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return 'That handle is already taken. Choose another one.';
        return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to save your public profile.';
    }

    constructor(readonly auth: AuthService, readonly library: LibraryService, readonly theme: ThemeService, readonly display: DisplaySettingsService, private readonly friends: FriendsService) {
    }
}
