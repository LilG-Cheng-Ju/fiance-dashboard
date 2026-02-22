import { inject, computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { User, UserRole } from '../models/user.model';

interface UserManagementState {
  rawUsers: User[];
  users: User[];
  loading: boolean;
  searchQuery: string;
  filterRole: UserRole | null; // null means 'ALL'
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: UserManagementState = {
  rawUsers: [],
  users: [],
  loading: false,
  searchQuery: '',
  filterRole: null,
  page: 0,
  pageSize: 20,
  sortBy: 'role',
  sortOrder: 'asc',
};

export const UserManagementStore = signalStore(
  withState(initialState),
  
  withComputed(({ rawUsers, searchQuery, filterRole, sortBy, sortOrder, page, pageSize }) => {
    // 1. Filter
    const filteredUsers = computed(() => {
      let users = rawUsers();
      const query = searchQuery().toLowerCase();
      const role = filterRole();

      if (role) {
        users = users.filter(u => u.role === role);
      }
      if (query) {
        users = users.filter(u => u.email.toLowerCase().includes(query));
      }
      return users;
    });

    // 2. Sort
    const sortedUsers = computed(() => {
      const users = [...filteredUsers()];
      const key = sortBy();
      const order = sortOrder() === 'asc' ? 1 : -1;

      return users.sort((a, b) => {
        let valA: any = a[key as keyof User];
        let valB: any = b[key as keyof User];

        // Custom weight for Role sorting
        if (key === 'role') {
           const roleWeight = { [UserRole.OWNER]: 1, [UserRole.ADMIN]: 2, [UserRole.FRIEND]: 3, [UserRole.PAID]: 4, [UserRole.USER]: 5 };
           valA = roleWeight[a.role] || 99;
           valB = roleWeight[b.role] || 99;
        }

        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    });

    // 3. Paginate
    const paginatedUsers = computed(() => {
      const start = page() * pageSize();
      const end = start + pageSize();
      return sortedUsers().slice(start, end);
    });

    return {
      users: paginatedUsers,
      totalCount: computed(() => filteredUsers().length),
      hasMore: computed(() => (page() + 1) * pageSize() < filteredUsers().length),
    };
  }),

  withMethods((store, userService = inject(UserService)) => ({
    
    loadUsers: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => {
          // Fetch all users (limit 1000)
          return userService.getUsers(0, 1000).pipe(
            tapResponse({
              next: (users) => patchState(store, { rawUsers: users, loading: false }),
              error: (err) => {
                console.error(err);
                patchState(store, { loading: false });
              }
            })
          );
        })
      )
    ),

    refresh() {
      this.loadUsers();
    },

    setSearchQuery(query: string) {
      patchState(store, { searchQuery: query, page: 0 }); // Reset to page 0
    },

    setFilterRole(role: UserRole | null) {
      patchState(store, { filterRole: role, page: 0 });
    },

    setSort(column: string) {
      const currentSort = store.sortBy();
      const currentOrder = store.sortOrder();
      
      if (currentSort === column) {
        // Toggle order
        const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        patchState(store, { sortOrder: newOrder, page: 0 });
      } else {
        // New column, default to desc
        patchState(store, { sortBy: column, sortOrder: 'desc', page: 0 });
      }
    },

    nextPage() {
      const newPage = store.page() + 1;
      patchState(store, { page: newPage });
    },

    prevPage() {
      if (store.page() > 0) {
        const newPage = store.page() - 1;
        patchState(store, { page: newPage });
      }
    },

    updateUserRole: rxMethod<{ uid: string; role: UserRole }>(
      pipe(
        switchMap(({ uid, role }) => 
          userService.updateUserRole(uid, role).pipe(
            tapResponse({
              next: (updatedUser) => {
                // Optimistic update or refresh list
                patchState(store, (state) => ({
                  rawUsers: state.rawUsers.map(u => u.uid === uid ? updatedUser : u)
                }));
              },
              error: (err) => console.error('Failed to update role', err)
            })
          )
        )
      )
    ),

    deleteUser: rxMethod<string>(
      pipe(
        switchMap((uid) => 
          userService.deleteUser(uid).pipe(
            tapResponse({
              next: () => {
                patchState(store, (state) => ({
                  rawUsers: state.rawUsers.filter(u => u.uid !== uid)
                }));
              },
              error: (err) => console.error('Failed to delete user', err)
            })
          )
        )
      )
    )
  }))
);
