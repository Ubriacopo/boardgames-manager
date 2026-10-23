import {Component, Input, OnChanges, signal} from '@angular/core';
import type {SocialProfile} from '../services/friends.service';

@Component({
    selector: 'app-profile-avatar',
    standalone: true,
    template: `
        <span class="flex size-14 items-center justify-center overflow-hidden rounded-full border border-line bg-mint text-base font-bold text-brand"
              role="img" [attr.aria-label]="(profile?.display_name || 'Collector') + ' profile picture'">
              @if (profile?.avatar_url && !broken()) {
                    <img class="block size-full object-cover" [src]="profile!.avatar_url" alt="" loading="lazy"
                         (error)="broken.set(true)">
              } @else { <span aria-hidden="true">{{ initials }}</span> }
            </span>
    `,
    host: {class: 'inline-flex shrink-0'},
})
export class ProfileAvatarComponent implements OnChanges {
    @Input() profile?: SocialProfile | null;
    readonly broken = signal(false);

    get initials(): string {
        const name = this.profile?.display_name === 'Board game collector' ? this.profile.handle : this.profile?.display_name;
        return (name || this.profile?.handle || 'Collector').split(/[\s.]+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    }

    ngOnChanges(): void {
        this.broken.set(false);
    }
}
