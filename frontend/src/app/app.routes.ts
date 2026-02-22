import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard'; // Import guards
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
    canActivate: [loginGuard], // If logged in, go to dashboard
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard], // If NOT logged in, go to login
    // If you have child routes, they will be protected too
    children: [
      // ... your dashboard child routes
    ],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/user-management/user-management').then((m) => m.UserManagementComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: '',
    redirectTo: 'dashboard', // Default route
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
