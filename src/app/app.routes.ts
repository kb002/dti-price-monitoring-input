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
    path: 'nueva',  // ✅ FIXED: Changed from 'nueva-vizcaya' to 'nueva'
    loadComponent: () => import('./nueva/nueva.page').then(m => m.NuevaPage),
    canActivate: [authGuard]
  },
  {
    path: 'quirino',
    loadComponent: () => import('./quirino/quirino.page').then(m => m.QuirinoPage),
    canActivate: [authGuard]
  },
  {
    path: 'batanes',
    loadComponent: () => import('./batanes/batanes.page').then( m => m.BatanesPage),
    canActivate: [authGuard]
  },
  {
    path: 'cagayan-business',
    loadComponent: () => import('./cagayan-business/cagayan-business.page').then( m => m.CagayanBusinessPage),
    canActivate: [authGuard]
  },
  {
    path: 'isabela-business',
    loadComponent: () => import('./isabela-business/isabela-business.page').then( m => m.IsabelaBusinessPage),
    canActivate: [authGuard]
  },
  {
    path: 'nueva-business',
    loadComponent: () => import('./nueva-business/nueva-business.page').then( m => m.NuevaBusinessPage),
    canActivate: [authGuard]
  },
  {
    path: 'quirino-business',
    loadComponent: () => import('./quirino-business/quirino-business.page').then( m => m.QuirinoBusinessPage),
    canActivate: [authGuard]
  },
  {
    path: 'batanes-business',  // ✅ ADDED: This was missing!
    loadComponent: () => import('./batanes-business/batanes-business.page').then( m => m.BatanesBusinessPage),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin/admin.page').then( m => m.AdminPage)
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
    path: 'add-batanes',
    loadComponent: () => import('./add-batanes/add-batanes.page').then( m => m.AddBatanesPage),
    canActivate: [authGuard]
  },
  {
    path: 'view-file/:province/:fileId',
    loadComponent: () => import('./view-file/view-file.page').then( m => m.ViewFilePage)
  },
  {
    path: 'edit-file/:province/:fileId',
    loadComponent: () => import('./edit-file/edit-file.page').then( m => m.EditFilePage)
  },
  {
    path: 'baseline-input',
    loadComponent: () => import('./baseline-input/baseline-input.page').then( m => m.BaselineInputPage)
  },
  {
    path: '**',
    redirectTo: 'login'
  },
  
];