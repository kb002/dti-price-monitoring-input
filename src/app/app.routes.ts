import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'cagayan',
    loadComponent: () => import('./cagayan/cagayan.page').then(m => m.CagayanPage),
    canActivate: [authGuard]
  },
  {
    path: 'isabela',
    loadComponent: () => import('./isabela/isabela.page').then(m => m.IsabelaPage),
    canActivate: [authGuard]
  },
  {
    path: 'nueva-vizcaya',
    loadComponent: () => import('./nueva/nueva.page').then(m => m.NuevaPage),
    canActivate: [authGuard]
  },
  {
    path: 'quirino',
    loadComponent: () => import('./quirino/quirino.page').then(m => m.QuirinoPage),
    canActivate: [authGuard]
  },
  {
    path: 'add-nueva',
    loadComponent: () => import('./add-nueva/add-nueva.page').then( m => m.AddNuevaPage),
    canActivate: [authGuard]
  },
  {
    path: 'add-cagayan',
    loadComponent: () => import('./add-cagayan/add-cagayan.page').then( m => m.AddCagayanPage),
    canActivate: [authGuard]
  },
  {
    path: 'add-isabela',
    loadComponent: () => import('./add-isabela/add-isabela.page').then( m => m.AddIsabelaPage),
    canActivate: [authGuard]
  },
  {
    path: 'add-quirino',
    loadComponent: () => import('./add-quirino/add-quirino.page').then( m => m.AddQuirinoPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  },
];