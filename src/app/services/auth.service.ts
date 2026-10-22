import { Injectable, NgZone, computed, signal } from '@angular/core';
import type { Session, Subscription } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { HandleService } from './handle.service';
import { validateHandle } from '../../utils/handles';
import { supabase } from '../../utils/supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly isAdmin = computed(() => this.session()?.user.app_metadata['role'] === 'admin');
  readonly initializing = signal(true);
  readonly error = signal<string | null>(null);
  private subscription?: Subscription;

  constructor(private readonly zone: NgZone, private readonly router: Router, private readonly handles: HandleService) {}

  initialize(): void {
    if (this.subscription) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      this.zone.run(() => {
        this.session.set(session);
        this.initializing.set(false);
        if (event === 'SIGNED_OUT') void this.router.navigate(['/login']);
      });
    });
    this.subscription = data.subscription;
  }

  async signIn(email: string, password: string): Promise<void> {
    this.error.set(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async signUp(email: string, password: string, value: string): Promise<boolean> {
    this.error.set(null);
    const handle = validateHandle(value);
    if (!await this.handles.available(handle)) throw new Error('That handle is already taken. Choose another one.');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { handle } } });
    if (error) {
      // A concurrent registration can claim the handle after the availability check.
      if (!await this.handles.available(handle)) throw new Error('That handle is already taken. Choose another one.');
      throw error;
    }
    return Boolean(data.session);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) this.error.set(error.message);
  }
}
