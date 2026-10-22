import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { Connection, FriendsService, SocialProfile } from '../services/friends.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './friends.component.html',
})
export class FriendsComponent implements OnInit {
  query = '';
  results: SocialProfile[] = [];
  connections: Connection[] = [];
  people: Record<string, SocialProfile> = {};
  readonly loading = signal(true);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  private searchVersion = 0;

  constructor(readonly auth: AuthService, private readonly friends: FriendsService) {}

  get userId(): string { return this.auth.session()?.user.id ?? ''; }
  get incoming(): Connection[] { return this.connections.filter(c => c.status === 'pending' && c.recipient_id === this.userId); }
  get outgoing(): Connection[] { return this.connections.filter(c => c.status === 'pending' && c.requester_id === this.userId); }
  get connected(): Connection[] {
    return this.connections.filter(c => c.status === 'accepted' && (c.kind === 'friend' || c.requester_id === this.userId));
  }
  get followers(): Connection[] { return this.connections.filter(c => c.kind === 'follow' && c.recipient_id === this.userId); }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.friends.ensureProfile(this.userId);
      await this.reload();
    } catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  private async reload(): Promise<void> {
    this.connections = await this.friends.connections(this.userId);
    const ids = [...new Set(this.connections.flatMap(c => [c.requester_id, c.recipient_id]))];
    this.people = Object.fromEntries((await this.friends.profiles(ids)).map(p => [p.id, p]));
  }

  other(connection: Connection): SocialProfile | undefined {
    return this.people[connection.requester_id === this.userId ? connection.recipient_id : connection.requester_id];
  }

  existing(profile: SocialProfile): Connection | undefined {
    return this.connections.find(c => (c.kind === 'friend' && [c.requester_id, c.recipient_id].includes(profile.id))
      || (c.kind === 'follow' && c.requester_id === this.userId && c.recipient_id === profile.id));
  }

  canBrowse(connection: Connection): boolean {
    return connection.status === 'accepted' && (connection.kind === 'friend'
      || (connection.requester_id === this.userId && this.other(connection)?.connection_mode === 'follow'));
  }

  async search(): Promise<void> {
    const version = ++this.searchVersion;
    this.searching.set(true);
    this.error.set('');
    try {
      const results = await this.friends.search(this.query, this.userId);
      if (version === this.searchVersion) { this.results = results; this.searched.set(true); }
    } catch (error) { if (version === this.searchVersion) this.error.set(this.message(error)); }
    finally { if (version === this.searchVersion) this.searching.set(false); }
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
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try { await work(); await this.reload(); this.notice.set(notice); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.busy.set(false); }
  }

  private message(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return 'A connection or request already exists. Refresh your connections to see it.';
    }
    return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to load friends. Please try again.';
  }
}
