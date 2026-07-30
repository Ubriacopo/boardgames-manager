import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { supabase } from '../utils/supabase';
import { LibraryService } from './services/library.service';

const libraryGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const library = inject(LibraryService);
  const { data } = await supabase.auth.getSession();
  if (!data.session) return router.createUrlTree(['/login']);
  await library.load(data.session);
  return true;
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'library' },
  { path: 'login', loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent) },
  { path: 'library', canActivate: [libraryGuard], loadComponent: () => import('./pages/library.component').then((m) => m.LibraryComponent) },
  { path: 'games', canActivate: [libraryGuard], loadComponent: () => import('./pages/games.component').then((m) => m.GamesComponent) },
  { path: 'games/:id', canActivate: [libraryGuard], loadComponent: () => import('./pages/game-detail.component').then((m) => m.GameDetailComponent) },
  { path: 'reviews/:bggId', canActivate: [libraryGuard], loadComponent: () => import('./pages/reviews.component').then((m) => m.GameReviewsComponent) },
  { path: 'add/details/:bggId', canActivate: [libraryGuard], loadComponent: () => import('./pages/search-game-detail.component').then((m) => m.SearchGameDetailComponent) },
  { path: 'add', canActivate: [libraryGuard], loadComponent: () => import('./pages/add-game.component').then((m) => m.AddGameComponent) },
  { path: 'profile', canActivate: [libraryGuard], loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent) },
  { path: 'session/:code', loadComponent: () => import('./pages/session.component').then((m) => m.SessionComponent) },
  { path: '**', redirectTo: 'library' },
];
