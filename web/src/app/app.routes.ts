import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from '@core/guards/auth.guards';
import { PROBLEM_LIST } from '@core/models/problem.config';
import { SolverStore } from '@features/solver/data-access/solver.store';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', title: 'title.landing', loadComponent: () => import('@features/landing/landing-page').then((m) => m.LandingPage) },

      // Guests only
      {
        path: '',
        canActivate: [guestGuard],
        children: [
          { path: 'login', title: 'title.login', loadComponent: () => import('@features/auth/login-page').then((m) => m.LoginPage) },
          { path: 'signup', title: 'title.signup', loadComponent: () => import('@features/auth/signup-page').then((m) => m.SignupPage) },
        ],
      },

      // Logged-in users
      {
        path: '',
        canActivate: [authGuard],
        children: [
          { path: 'home', title: 'title.home', loadComponent: () => import('@features/home/home-page').then((m) => m.HomePage) },
          { path: 'profile', title: 'title.profile', loadComponent: () => import('@features/profile/profile-page').then((m) => m.ProfilePage) },
          {
            path: 'solve',
            children: [
              // Reopen the planner on the problem last used.
              { path: '', pathMatch: 'full', redirectTo: () => `/solve/${inject(SolverStore).problem()}` },
              ...PROBLEM_LIST.map((p) => ({
              path: p.type,
              title: p.title,
              data: { problem: p.type },
                loadComponent: () => import('@features/solver/solver-page').then((m) => m.SolverPage),
              })),
            ],
          },
          {
            path: 'admin/users',
            title: 'title.users',
            canActivate: [adminGuard],
            loadComponent: () => import('@features/admin/users-page').then((m) => m.UsersPage),
          },
        ],
      },

      { path: '**', loadComponent: () => import('@shared/components/not-found-page').then((m) => m.NotFoundPage) },
    ],
  },
];
