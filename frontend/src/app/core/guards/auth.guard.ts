import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Protects routes that require authentication.
 * Redirects unauthenticated users to the login page.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // We use the service stream directly because the Router expects an Observable.
  // The store is better suited for UI state (Signals).
  return authService.user$.pipe(
    // Ensure we only take the first emitted value and complete the observable
    take(1),
    map((user) => {
      const isAuthenticated = !!user;

      if (isAuthenticated) {
        return true;
      }

      // Return a UrlTree to redirect
      return router.createUrlTree(['/login']);
    }),
  );
};

/**
 * Redirects authenticated users away from public pages (like login).
 * If a user is already logged in, send them to the dashboard.
 */
export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map((user) => {
      const isAuthenticated = !!user;

      if (isAuthenticated) {
        // User is already logged in, redirect to dashboard
        return router.createUrlTree(['/dashboard']);
      }

      // Allow access to the login page
      return true;
    }),
  );
};
