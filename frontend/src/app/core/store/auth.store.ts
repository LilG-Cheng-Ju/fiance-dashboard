import { inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { UserProfile, User, UserRole } from '../models/user.model';

interface AuthState {
  user: UserProfile | null;
  backendUser: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  backendUser: null,
  loading: true, // Start with true to block UI while checking auth status
  error: null,
  initialized: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ backendUser, user }) => ({
    isAuthenticated: computed(() => !!user()),
    role: computed(() => backendUser()?.role || UserRole.USER),
    isAdmin: computed(() => {
      const r = backendUser()?.role;
      return r === UserRole.ADMIN || r === UserRole.OWNER;
    }),
    isOwner: computed(() => backendUser()?.role === UserRole.OWNER),
  })),

  withMethods((store) => {
    const authService = inject(AuthService);
    const userService = inject(UserService);
    const router = inject(Router);

    return {
      // Connect to the stream of user changes from Firebase
      _connectUserStream: rxMethod<void>(
        pipe(
          switchMap(() => authService.user$),
          switchMap((user) => {
            if (!user) {
              // Case: Logout
              patchState(store, {
                user: null,
                backendUser: null,
                loading: false,
                error: null,
                initialized: true,
              });
              return of(null);
            }

            // Case: Firebase Login Success -> Set basic info
            patchState(store, { user, loading: true, error: null });

            // Chain: Fetch Backend User Role
            return userService.getMe().pipe(
              tapResponse({
                next: (backendUser) => {
                  patchState(store, {
                    backendUser,
                    loading: false,
                    initialized: true,
                  });

                  // Redirect logic
                  const currentUrl = router.url;
                  if (currentUrl.includes('/login')) {
                    router.navigate(['/dashboard']);
                  }
                },
                error: (err) => {
                  console.error('[AuthStore] Failed to fetch backend user', err);
                  // Fallback: User is logged in Firebase but backend failed
                  patchState(store, {
                    loading: false,
                    error: 'Backend sync failed',
                    initialized: true,
                  });
                },
              })
            );
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
