import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const authGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state) => {
  console.log('=== AUTH GUARD CALLED ===');
  console.log('Target URL:', state.url);
  
  const router = inject(Router);
  const auth = inject(Auth);

  // Wait for Firebase Auth to initialize
  const currentUser = await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
  
  console.log('Auth state resolved:', currentUser ? 'User logged in' : 'No user');

  // Check if user is authenticated
  if (!currentUser) {
    console.log('Auth Guard: No user authenticated, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  console.log('Auth Guard: User authenticated:', currentUser);

  // For province checking, use localStorage as cache
  const userProvince = localStorage.getItem('userProvince');

  // If no province is cached, let them through
  if (!userProvince) {
    console.log('Auth Guard: No province set, allowing access');
    return true;
  }

  // Map routes to province names
  const routeToProvinceMap: { [key: string]: string } = {
    '/cagayan': 'cagayan',
    '/isabela': 'isabela',
    '/nueva-vizcaya': 'nueva_vizcaya',
    '/nueva': 'nueva_vizcaya',
    '/add-nueva': 'nueva_vizcaya',
    '/quirino': 'quirino'
  };

  const currentRoute = state.url.split('?')[0];
  const requiredProvince = routeToProvinceMap[currentRoute];

  console.log('Auth Guard: Current route:', currentRoute);
  console.log('Auth Guard: Required province:', requiredProvince);
  console.log('Auth Guard: User province:', userProvince);

  // Check if user is trying to access their own province page
  if (requiredProvince && userProvince !== requiredProvince) {
    console.log('Auth Guard: Province mismatch, redirecting to user province');
    // User is trying to access a different province - redirect to their own
    switch(userProvince) {
      case 'cagayan':
        router.navigate(['/cagayan']);
        break;
      case 'isabela':
        router.navigate(['/isabela']);
        break;
      case 'nueva_vizcaya':
        router.navigate(['/nueva-vizcaya']);
        break;
      case 'quirino':
        router.navigate(['/quirino']);
        break;
      default:
        router.navigate(['/login']);
    }
    return false;
  }

  console.log('Auth Guard: Access granted');
  return true;
};