import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { AdminService } from '../services/admin.service';
import { FriendCode } from '../models/friend-code.model';

type FriendCodeAdminState = {
  codes: FriendCode[];
  isLoading: boolean;
  error: string | null;
  sortBy: 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
};

const initialState: FriendCodeAdminState = {
  codes: [],
  isLoading: false,
  error: null,
  sortBy: 'status', // Default sort by status
  sortOrder: 'asc',   // 'asc' so that 'unused' (false) comes before 'used' (true)
};

export const FriendCodeAdminStore = signalStore(
  withState(initialState),

  withComputed((store) => ({
    sortedCodes: computed(() => {
      const codes = [...store.codes()]; // Create a new array to avoid mutating state
      const sortBy = store.sortBy();
      const sortOrder = store.sortOrder();
      const direction = sortOrder === 'asc' ? 1 : -1;

      return codes.sort((a, b) => {
        if (sortBy === 'status') {
          return (Number(a.is_used) - Number(b.is_used)) * direction;
        }
        // Default to created_at
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return (dateA - dateB) * direction;
      });
    }),
    unusedCodes: computed(() => store.codes().filter(c => !c.is_used)),
    usedCodes: computed(() => store.codes().filter(c => c.is_used)),
  })),

  withMethods((store, adminService = inject(AdminService)) => ({
    loadCodes: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          adminService.getFriendCodes().pipe(
            tapResponse({
              next: (codes) => patchState(store, { codes, isLoading: false }),
              error: (err: any) => patchState(store, { 
                isLoading: false, 
                error: err?.error?.detail || err?.message || 'Failed to load codes' 
              }),
            })
          )
        )
      )
    ),

    addCodes: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((count: number) =>
          adminService.createFriendCodes(count).pipe(
            tapResponse({
              next: (newCodes) => {
                patchState(store, (state) => ({ codes: [...newCodes, ...state.codes], isLoading: false }));
              },
              error: (err: any) => patchState(store, { 
                isLoading: false, 
                error: err?.error?.detail || err?.message || 'Failed to create codes' 
              }),
            })
          )
        )
      )
    ),

    setSort(newSortBy: 'status' | 'created_at') {
      const currentSortBy = store.sortBy();
      if (newSortBy === currentSortBy) {
        const newOrder = store.sortOrder() === 'asc' ? 'desc' : 'asc';
        patchState(store, { sortOrder: newOrder });
      } else {
        patchState(store, { sortBy: newSortBy, sortOrder: 'asc' });
      }
    },
  }))
);