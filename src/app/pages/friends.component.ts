import {Component, OnDestroy, OnInit, TemplateRef, ViewChild, signal} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {MatIconModule} from '@angular/material/icon';
import {ProfileAvatarComponent} from '../components/profile-avatar.component';
import {AuthService} from '../services/auth.service';
import {Connection, FriendsService, SocialProfile} from '../services/friends.service';

@Component({
    standalone: true,
    imports: [FormsModule, RouterLink, NgTemplateOutlet, MatButtonModule, MatIconModule, MatTabsModule, MatDialogModule, ProfileAvatarComponent],
    templateUrl: './friends.component.html',
})
export class FriendsComponent implements OnInit, OnDestroy {
    query = '';
    results: SocialProfile[] = [];
    connections: Connection[] = [];
    people: Record<string, SocialProfile> = {};
    readonly selectedTab = signal(0);
    readonly loading = signal(true);
    readonly searching = signal(false);
    readonly searched = signal(false);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly notice = signal('');
    @ViewChild('addFriendDialog', {static: true}) private addFriendTemplate!: TemplateRef<unknown>;
    private addDialog?: MatDialogRef<unknown>;
    private searchVersion = 0;

    constructor(readonly auth: AuthService, private readonly friends: FriendsService, private readonly dialog: MatDialog) {
    }

    get userId(): string {
        return this.auth.session()?.user.id ?? '';
    }

    get incoming(): Connection[] {
        return this.connections.filter(c => c.status === 'pending' && c.recipient_id === this.userId);
    }

    get outgoing(): Connection[] {
        return this.connections.filter(c => c.status === 'pending' && c.requester_id === this.userId);
    }

    get followed(): Connection[] {
        return this.accepted('followed');
    }

    get followers(): Connection[] {
        return this.accepted('followers');
    }

    private accepted(direction: 'followed' | 'followers'): Connection[] {
        const people = new Map<string, Connection>();
        for (const connection of this.connections) {
            if (connection.status !== 'accepted') continue;
            if (connection.kind === 'follow' && (direction === 'followed'
                    ? connection.requester_id !== this.userId : connection.recipient_id !== this.userId)) continue;
            const id = connection.requester_id === this.userId ? connection.recipient_id : connection.requester_id;
            if (!people.has(id) || connection.kind === 'friend') people.set(id, connection);
        }
        return [...people.values()];
    }

    async ngOnInit(): Promise<void> {
        this.loading.set(true);
        this.error.set('');
        try {
            await this.friends.ensureProfile(this.userId);
            await this.reload();
        } catch (error) {
            this.error.set(this.message(error));
        } finally {
            this.loading.set(false);
        }
    }

    private async reload(): Promise<void> {
        const connections = await this.friends.connections(this.userId);
        const ids = [...new Set(connections.flatMap(c => [c.requester_id, c.recipient_id]))];
        const people = await this.friends.profiles(ids);
        this.connections = connections;
        this.people = Object.fromEntries(people.map(p => [p.id, p]));
    }

    other(connection: Connection): SocialProfile | undefined {
        return this.people[connection.requester_id === this.userId ? connection.recipient_id : connection.requester_id];
    }

    pendingFor(profile: SocialProfile): Connection | undefined {
        return this.connections.find(c => c.kind === 'friend' && c.status === 'pending'
                && [c.requester_id, c.recipient_id].includes(profile.id));
    }

    canBrowse(profile: SocialProfile): boolean {
        return this.connections.some(c => c.status === 'accepted' && (
                (c.kind === 'friend' && [c.requester_id, c.recipient_id].includes(profile.id))
                || (c.kind === 'follow' && c.requester_id === this.userId && c.recipient_id === profile.id && profile.connection_mode === 'follow')
        ));
    }

    openAddFriend(): void {
        if (this.addDialog) return;
        this.query = '';
        this.results = [];
        this.searched.set(false);
        this.searching.set(false);
        this.error.set('');
        this.searchVersion++;
        this.addDialog = this.dialog.open(this.addFriendTemplate, {
            width: '600px',
            maxWidth: '95vw',
            autoFocus: 'first-tabbable'
        });
        this.addDialog.afterClosed().subscribe(() => {
            this.addDialog = undefined;
            this.searchVersion++;
            this.searching.set(false);
        });
    }

    async search(): Promise<void> {
        const version = ++this.searchVersion;
        this.searching.set(true);
        this.error.set('');
        try {
            const results = await this.friends.search(this.query, this.userId);
            if (version === this.searchVersion) {
                this.results = results;
                this.searched.set(true);
            }
        } catch (error) {
            if (version === this.searchVersion) this.error.set(this.message(error));
        } finally {
            if (version === this.searchVersion) this.searching.set(false);
        }
    }

    async connect(profile: SocialProfile): Promise<void> {
        await this.action(() => this.friends.connect(this.userId, profile),
                profile.connection_mode === 'follow' ? `Following ${profile.display_name}.` : `Friend request sent to ${profile.display_name}.`);
    }

    async accept(connection: Connection): Promise<void> {
        await this.action(() => this.friends.accept(connection.id), 'Friend request accepted. You can now browse each other’s collections.');
    }

    async remove(connection: Connection): Promise<void> {
        await this.action(() => this.friends.remove(connection.id), 'Connection removed.');
    }

    private async action(work: () => Promise<void>, notice: string): Promise<void> {
        if (this.busy()) return;
        this.busy.set(true);
        this.error.set('');
        this.notice.set('');
        try {
            await work();
            await this.reload();
            this.notice.set(notice);
        } catch (error) {
            this.error.set(this.message(error));
        } finally {
            this.busy.set(false);
        }
    }

    private message(error: unknown): string {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            return 'A connection or request already exists. Refresh your connections to see it.';
        }
        return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to load friends. Please try again.';
    }

    ngOnDestroy(): void {
        this.searchVersion++;
        this.addDialog?.close();
    }
}
