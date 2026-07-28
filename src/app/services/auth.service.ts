import { Injectable, NgZone, signal } from '@angular/core';
import type { Session, Subscription } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly initializing = signal(true);
  readonly error = signal<string | null>(null);
  private subscription?: Subscription;

  constructor(private readonly zone: NgZone) {}

  initialize(): void {
    if (this.subscription) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      this.zone.run(() => {
        this.session.set(session);
        this.initializing.set(false);
      });
    });
    this.subscription = data.subscription;
  }

  async signIn(email: string, password: string): Promise<void> {
    this.error.set(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async signUp(email: string, password: string): Promise<boolean> {
    this.error.set(null);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    return Boolean(data.session);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) this.error.set(error.message);
  }
}
