import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserProfile } from '../models/user.model';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: true, // Start with true to block UI while checking auth status
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withMethods((store) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return {
      // Connect to the stream of user changes from Firebase
      _connectUserStream: rxMethod<void>(
        pipe(
          switchMap(() => authService.user$),
          tap((user) => {
            patchState(store, {
              user,
              loading: false,
              error: null,
            });

            // Redirect logic could be placed here or in a Guard
            if (user) {
              // Optional: Redirect to dashboard if on login page
              const currentUrl = router.url;
              if (currentUrl.includes('/login')) {
                router.navigate(['/dashboard']);
              }
            }
          }),
        ),
      ),

      async loginWithGoogle() {
        patchState(store, { loading: true, error: null });
        try {
          await authService.loginWithGoogle();
          // State update is handled by _connectUserStream
        } catch (err: any) {
          patchState(store, { loading: false, error: err.message });
        }
      },

      async loginWithEmail(email: string, pass: string) {
        patchState(store, { loading: true, error: null });
        try {
          await authService.loginWithEmail(email, pass);
        } catch (err: any) {
          patchState(store, { loading: false, error: err.message });
        }
      },

      async register(email: string, pass: string, name: string) {
        patchState(store, { loading: true, error: null });
        try {
          await authService.registerWithEmail(email, pass, name);
        } catch (err: any) {
          patchState(store, { loading: false, error: err.message });
        }
      },

      async logout() {
        patchState(store, { loading: true });
        try {
          await authService.logout();
          router.navigate(['/login']);
        } catch (err: any) {
          patchState(store, { error: err.message, loading: false });
        }
      },
    };
  }),

  withHooks({
    onInit(store) {
      // Initialize the listener immediately
      store._connectUserStream();
    },
  }),
);
